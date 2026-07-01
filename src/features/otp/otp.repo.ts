import { sql } from "bun";
import { pg } from "@/db/pgdb";

type OTP = {
  otp: string;
  expires_at: Date;
  user_id: string;
};

export async function createOTP(data: OTP) {
  try {
    const res = await pg`INSERT into otp ${sql(data)} returning *`;
    console.log(res);
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

export async function verifyUser(userID: string) {
  const res = await pg`
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

export async function createEmailOTP({
  user_id,
  otp,
  email_id,
}: {
  user_id: string;
  otp: string;
  email_id: string;
}) {
  const user = await pg`SELECT email from users where user_id = ${user_id}`;
  const values = {
    email_id,
    recepient: user[0].email,
    content: otp,
    type: "OTP",
    status: "pending",
  };

  await pg`INSERT into emails ${sql(values)} `;
  return true;
}

export async function getOTP(userID: string) {
  console.log(userID);
  const res: OTP[] =
    await pg`SELECT * from otp where user_id = ${userID} order by expires_at DESC`;
  return res;
}
