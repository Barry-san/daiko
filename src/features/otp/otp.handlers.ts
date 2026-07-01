import type { VerifyBody } from "@/schemas/auth.schema";
import { handleCreateOTP, handleVerifyOTP } from "./otp.services";

export const createOTPHandler = async ({ user }: { user: string }) => {
  const isSuccess = await handleCreateOTP(user);
  return { data: { isSuccess } };
};

export const verifyOTPHandler = async ({ body, user }: { body: VerifyBody; user: string }) => {
  const res = await handleVerifyOTP(body.OTP, user);
  return res;
};
