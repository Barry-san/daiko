import Elysia from "elysia";
import { authRateLimiter } from "../../middleware/ratelimiter";
import { loginBody, signupBody } from "../../schemas/auth.schema";
import { loginHandler, logoutHandler, oauthHandler, refreshHandler, signupHandler } from "./auth.handlers";

export const authRoutes = new Elysia({ prefix: "/auth" }).onRequest(authRateLimiter);

authRoutes.post("/login", loginHandler, { body: loginBody })
authRoutes.post("/signup", signupHandler, { body: signupBody })
authRoutes.post("/refresh", refreshHandler)
authRoutes.post("/logout", logoutHandler)
authRoutes.post("/oauth", oauthHandler)
authRoutes.get("/", (c) => "hello there")
