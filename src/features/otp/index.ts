import Elysia from "elysia";
import { authPlugin } from "@/middleware/authentication";
import { OTPRateLimiter } from "@/middleware/ratelimiter";
import { verifyBody } from "@/schemas/auth.schema";
import { createOTPHandler, verifyOTPHandler } from "./otp.handlers";

export const otpRoutes = new Elysia({ prefix: "/otp" })
  .onBeforeHandle(OTPRateLimiter)
  .use(authPlugin)
  .post("/", createOTPHandler)
  .post("/verify", verifyOTPHandler, { body: verifyBody });
