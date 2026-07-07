import { sql } from "bun";

type OTP = {
  otp: string;
  expires_at: Date;
  user_id: string;
};

export async function createOTP(db: Bun.SQL, data: OTP) {
  try {
    await db`INSERT into otp ${sql(data)} returning *`;
    return true;
  } catch {
    return false;
  }
}

export async function verifyUser(db: Bun.SQL, userID: string) {
  const res = await db`
    WITH updated_user AS (
      UPDATE users
      SET is_verified = true
      WHERE user_id = ${userID}
      RETURNING user_id, username, email, is_verified, created_at
    ),
    deleted_otps AS (
      DELETE FROM otp
      WHERE user_id = ${userID}
    )
    SELECT * FROM updated_user
  `;

  return res;
}

export async function createEmailOTP(
  db: Bun.SQL,
  {
    user_id,
    otp,
    email_id,
  }: {
    user_id: string;
    otp: string;
    email_id: string;
  },
) {
  await db`
    INSERT INTO emails (email_id, recipient, content, type, status)
    SELECT ${email_id}, email, ${otp}, 'OTP', 'pending'
    FROM users WHERE user_id = ${user_id}
  `;
  return true;
}

export async function getOTP(db: Bun.SQL, userID: string) {
  const res: OTP[] =
    await db`SELECT * from otp where user_id = ${userID} order by expires_at DESC LIMIT 1`;
  return res;
}
