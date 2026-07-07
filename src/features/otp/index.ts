import Elysia from "elysia";
import { pg } from "@/db/pgdb";
import { authPlugin } from "@/middleware/authentication";
import { OTPRateLimiter } from "@/middleware/ratelimiter.atomic";
import { verifyBody } from "@/schemas/auth.schema";
import { createOTPHandler, verifyOTPHandler } from "./otp.handlers";

export const otpRoutes = new Elysia({ prefix: "/otp" })
  .decorate("db", pg)
  .onBeforeHandle(OTPRateLimiter)
  .use(authPlugin)
  .post("/", createOTPHandler)
  .post("/verify", verifyOTPHandler, { body: verifyBody });
