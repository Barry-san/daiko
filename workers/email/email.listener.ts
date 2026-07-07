import postgres from "postgres";
import { Resend } from "resend";
import { pg } from "@/db/pgdb";
import { ENV } from "@/lib/env";
import { logger } from "@/lib/logger";

const resend = new Resend(ENV.RESEND_API_KEY);
const CHANNEL = "email_queue";
const MAX_RETRIES = 3;
const SWEEP_INTERVAL_MS = 60_000;

type EmailRow = {
  email_id: string;
  recipient: string;
  content: string;
  type: string;
  status: string;
  retry_count: number | null;
  failed_at: Date | null;
};

async function processEmail(row: EmailRow) {
  if (row.status !== "pending") return;

  const result = await resend.emails.send({
    to: row.recipient,
    subject: "Verify your account",
    from: "hello@mubarak.work",
    template: {
      id: "ee0b45ae-ad2d-4483-81fd-c450e53e6291",
      variables: {
        otp_code: row.content,
        company_name: "Daiko",
        first_name: "user",
      },
    },
  });

  if (!result.error) {
    logger.info({ email_id: row.email_id }, "Email sent");
    await pg`
      UPDATE emails
      SET status = 'success', completed_at = NOW()
      WHERE email_id = ${row.email_id}
    `;
  } else {
    logger.warn({ email_id: row.email_id, error: result.error }, "Email send failed");
    const newCount = (row.retry_count ?? 0) + 1;
    const newStatus = newCount >= MAX_RETRIES ? "failed" : "pending";

    await pg`
      UPDATE emails
      SET status = ${newStatus}, failed_at = NOW(), retry_count = ${newCount}
      WHERE email_id = ${row.email_id}
    `;
  }
}

async function sweepFailedEmails() {
  const failed = (await pg`
    SELECT * FROM emails
    WHERE status = 'failed'
      AND retry_count < ${MAX_RETRIES}
      AND (failed_at IS NULL OR failed_at < NOW() - INTERVAL '5 minutes')
  `) as EmailRow[];

  for (const row of failed) {
    await processEmail({ ...row, status: "pending" });
  }
}

async function processPendingEmails() {
  const pending = (await pg`
    SELECT * FROM emails WHERE status = 'pending'
  `) as EmailRow[];

  for (const row of pending) {
    await processEmail(row);
  }
}

async function startEmailListener() {

  const listenSql = postgres({
    host: "localhost",
    port: ENV.DB_PORT,
    database: ENV.DB_NAME,
    username: ENV.DB_USER,
    password: ENV.DB_PASSWORD,
  });

  await processPendingEmails();

  const meta = await listenSql.listen(CHANNEL, (payload: string) => {
    try {
      const row = JSON.parse(payload) as EmailRow;
      processEmail(row);
    } catch {
      logger.warn("Failed to parse notification");
    }
  });

  const sweepInterval = setInterval(sweepFailedEmails, SWEEP_INTERVAL_MS);

  process.on("SIGINT", () => shutdown(meta, sweepInterval, listenSql).then(() => process.exit(0)));
  process.on("SIGTERM", () => shutdown(meta, sweepInterval, listenSql).then(() => process.exit(0)));
}

async function shutdown(
  meta: postgres.ListenMeta,
  sweepInterval: ReturnType<typeof setInterval>,
  listenSql: postgres.Sql,
) {
  clearInterval(sweepInterval);
  meta.unlisten();
  await listenSql.end();
}

startEmailListener();
