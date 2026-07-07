import { randomInt } from "node:crypto"
import { StatusCodes } from "http-status-codes";
import { AppError } from "@/lib/error";
import { createEmailOTP, createOTP, getOTP, verifyUser } from "./otp.repo";

export async function handleCreateOTP(db: Bun.SQL, userId: string) {
  const otp = randomInt(1000000).toString().padStart(6, "0");
  const expires_at = new Date(Date.now() + 1000 * 60 * 10);

  const res = await createOTP(db, { otp, expires_at, user_id: userId });
  const email_id = Bun.randomUUIDv7();
  await createEmailOTP(db, { user_id: userId, otp, email_id });

  return res;
}

export async function handleVerifyOTP(db: Bun.SQL, otp: string, userId: string) {
  const otps = await getOTP(db, userId);
  const storedOTP = otps[0];

  if (new Date() > storedOTP.expires_at) {
    throw new AppError({
      status: StatusCodes.BAD_REQUEST,
      message: "OTP expired. Please request a new OTP.",
    });
  }

  if (otp !== storedOTP.otp) {
    throw new AppError({
      status: StatusCodes.BAD_REQUEST,
      message: "Invalid OTP.",
    });
  }

  if (otp === storedOTP.otp) {
    const res = await verifyUser(db, userId);
    return res;
  }
}
