import postgres from "postgres";
import { ENV } from "@/lib/env";

export async function streamBuildLogs({ projectId, db }: { projectId: string; db: Bun.SQL }) {
  const jobs = await db`SELECT * FROM jobs WHERE project_id = ${projectId} AND name = 'BUILD' ORDER BY created_at DESC LIMIT 1`;
  const job = (jobs as any[])[0];

  if (!job) {
    return new Response(JSON.stringify({ error: "No build job found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  let subscriber: postgres.Sql | null = null;
  let meta: any = null;

  const stream = new ReadableStream({
    async start(controller) {
      if (job.status === "complete" || job.status === "failed") {
        controller.enqueue(`data: ${JSON.stringify({ type: "status", status: job.status, time: Date.now() })}\n\n`);
        controller.close();
        return;
      }

      subscriber = postgres({
        host: "localhost",
        port: ENV.DB_PORT,
        database: ENV.DB_NAME,
        username: ENV.DB_USER,
        password: ENV.DB_PASSWORD,
      });

      const channel = `build_log_${job.job_id}`;
      meta = await subscriber.listen(channel, (payload: string) => {
        try {
          const event = JSON.parse(payload);
          try { controller.enqueue(`data: ${JSON.stringify(event)}\n\n`); } catch {}

          if (event.type === "status" && (event.status === "complete" || event.status === "failed")) {
            try { controller.close(); } catch {}
          }
        } catch {}
      });
    },
    cancel() {
      (async () => {
        try { if (meta) await meta.unlisten(); } catch {}
        try { if (subscriber) await subscriber.end(); } catch {}
        subscriber = null;
        meta = null;
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
