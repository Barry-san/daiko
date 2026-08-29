import { createResetBody,loginBodySchema,refreshCookie, resetBody, signupBodySchema,   } from "@daiko/shared";
import Elysia from "elysia";
import { pg } from "@/db/pgdb";
import { authRateLimiter } from "@/middleware/ratelimiter.atomic";
import {
  CreateResetLink,
  loginHandler,
  logoutHandler,
  oauthCallback,
  oauthHandler,
  refreshHandler,
  resetPassword,
  signupHandler,
} from "./auth.handlers";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .decorate("db", pg)
  .onBeforeHandle(authRateLimiter)
  .post("/login", loginHandler, { body: loginBodySchema })
  .post("/signup", signupHandler, { body: signupBodySchema })
  .post("/refresh", refreshHandler, { cookie: refreshCookie })
  .post("/logout", logoutHandler)
  .post("/create-reset", CreateResetLink, {body: createResetBody})
  .post("/reset", resetPassword, { body : resetBody } )
  .get(`/oauth/github`, oauthHandler)
  .get("/oauth/callback", oauthCallback);
