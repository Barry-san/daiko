import { StatusCodes } from "http-status-codes";
import { AppError } from "@/lib/error";
import { createOTP, getOTP, verifyUser, createEmailOTP } from "./otp.repo";

export async function handleCreateOTP(userId: string) {
  console.log("inna the otp creation");
  const otp = Math.abs(Math.round(Math.random() * 1000000) - 1)
    .toString()
    .padStart(6, "0");
  console.log(otp);
  const expires_at = new Date(Date.now() + 1000 * 60 * 10); // ten minutes from now

  const res = await createOTP({ otp, expires_at, user_id: userId });
  const email_id = Bun.randomUUIDv7();
  await createEmailOTP({ user_id: userId, otp, email_id });

  return res;
}

export async function handleVerifyOTP(otp: string, userId: string) {
  console.log(userId);
  const otps = await getOTP(userId);
  console.log(otps);
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
    const res = await verifyUser(userId);
    return res;
  }
}
