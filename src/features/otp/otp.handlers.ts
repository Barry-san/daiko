import type { VerifyBody } from "@/schemas/auth.schema";
import { handleCreateOTP, handleVerifyOTP } from "./otp.services";

export const createOTPHandler = async ({ user, db }: { user: string; db: Bun.SQL }) => {
  const isSuccess = await handleCreateOTP(db, user);
  return { data: { isSuccess } };
};

export const verifyOTPHandler = async ({ body, user, db }: { body: VerifyBody; user: string; db: Bun.SQL }) => {
  const res = await handleVerifyOTP(db, body.OTP, user);
  return res;
};
