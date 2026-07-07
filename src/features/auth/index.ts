import Elysia from "elysia";
import { pg } from "@/db/pgdb";
// import { authRateLimiter } from "@/middleware/ratelimiter.atomic";
import { loginBody, refreshCookie, signupBody } from "@/schemas/auth.schema";
import {
  loginHandler,
  logoutHandler,
  oauthCallback,
  oauthHandler,
  refreshHandler,
  signupHandler,
} from "./auth.handlers";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .decorate("db", pg)
  // .onBeforeHandle(authRateLimiter)
  .post("/login", loginHandler, { body: loginBody })
  .post("/signup", signupHandler, { body: signupBody })
  .post("/refresh", refreshHandler, { cookie: refreshCookie })
  .post("/logout", logoutHandler)
  .get(`/oauth/github`, oauthHandler)
  .get("/oauth/callback", oauthCallback);
