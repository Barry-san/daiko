import Elysia from "elysia";
import { authRateLimiter } from "@/middleware/ratelimiter";
import { loginBody, refreshCookie, signupBody } from "@/schemas/auth.schema";
import {
  loginHandler,
  logoutHandler,
  oauthCallback,
  oauthHandler,
  refreshHandler,
  signupHandler,
} from "./auth.handlers";

export const authRoutes = new Elysia({ prefix: "/auth" }).onBeforeHandle(authRateLimiter);

authRoutes.post("/login", loginHandler, { body: loginBody });
authRoutes.post("/signup", signupHandler, { body: signupBody });
authRoutes.post("/refresh", refreshHandler, { cookie: refreshCookie });
authRoutes.post("/logout", logoutHandler);
authRoutes.get(`/oauth/github`, oauthHandler);
authRoutes.get("/oauth/callback", () => oauthCallback);
