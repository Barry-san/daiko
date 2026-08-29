import type { CreateResetBody, LoginBody, ResetBody, SignupBody } from "@daiko/shared";
import { fetch, randomUUIDv7 } from "bun";
import { randomBytes } from "node:crypto";
import type { Cookie } from "elysia";
import { StatusCodes } from "http-status-codes";
import { ENV } from "@/lib/env";
import { AppError } from "@/lib/error";
import { revokeSession } from "./session.repo";
import { handleCreateResetLink, handleLogin, handleOauth, handleRefresh, handleResetPassword, handleSignup } from "./auth.services";

const REFRESH_COOKIE = "refreshToken";
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

function setRefreshCookie(cookie: Record<string, Cookie<unknown>>, value: string) {
  cookie[REFRESH_COOKIE].value = value;
  cookie[REFRESH_COOKIE].httpOnly = true;
  cookie[REFRESH_COOKIE].sameSite = "lax";
  cookie[REFRESH_COOKIE].secure = process.env.NODE_ENV === "production";
  cookie[REFRESH_COOKIE].maxAge = REFRESH_MAX_AGE;
}

export const loginHandler = async ({
  body,
  cookie,
  db,
}: {
  body: LoginBody;
  cookie: Record<string, Cookie<unknown>>;
  db: Bun.SQL;
}) => {
  const { email, password } = body;
  const res = await handleLogin(db, { email, password });
  setRefreshCookie(cookie, res.refreshToken);

  return { ...res, refreshToken: undefined };
};

export const signupHandler = async ({ body, db }: { body: SignupBody; db: Bun.SQL }) => {
  const user = await handleSignup(db, body);
  return { data: user };
};

export const logoutHandler = async ({ cookie, db }: { cookie: Record<string, Cookie<unknown>>; db: Bun.SQL }) => {
  const token = cookie.refreshToken.value as string | undefined;
  if (token) {
    await revokeSession(db, token).catch(() => {});
  }
  cookie.refreshToken.remove();
};

export const refreshHandler = async ({
  cookie,
  db,
}: {
  cookie: Record<string, Cookie<unknown>>;
  db: Bun.SQL;
}) => {
  const refreshToken = cookie.refreshToken.value as string;
  const { accessToken, refreshToken: nextRefreshToken } = await handleRefresh(db, refreshToken);
  setRefreshCookie(cookie, nextRefreshToken);
  return { data: { accessToken } };
};

const OAUTH_STATE_COOKIE = "oauthState";

export const oauthHandler = ({ redirect, cookie }: { redirect: (url: string) => Response; cookie: Record<string, Cookie<unknown>> }) => {
  const state = randomBytes(16).toString("hex");
  cookie[OAUTH_STATE_COOKIE].value = state;
  cookie[OAUTH_STATE_COOKIE].httpOnly = true;
  cookie[OAUTH_STATE_COOKIE].sameSite = "lax";
  cookie[OAUTH_STATE_COOKIE].secure = process.env.NODE_ENV === "production";
  cookie[OAUTH_STATE_COOKIE].maxAge = 7;

  return redirect(
    `https://github.com/login/oauth/authorize?response_type=code&client_id=${ENV.GITHUB_CLIENT_ID}&state=${state}&redirect_uri=${encodeURIComponent(ENV.GITHUB_REDIRECT_URI)}`,
  );
};

export const oauthCallback = async ({ query, db, cookie, redirect }: { query: Record<string, string>; db: Bun.SQL; cookie: Record<string, Cookie<unknown>>; redirect: (url: string) => Response }) => {
  const { code, state, error, error_description } = query;

  if (error) {
    throw new AppError({ message: `GitHub OAuth failed: ${error_description ?? error}`, status: StatusCodes.BAD_REQUEST });
  }

  const expectedState = cookie[OAUTH_STATE_COOKIE].value;
  if (!state || !expectedState || state !== expectedState) {
    throw new AppError({ message: "OAuth state mismatch. Please try again.", status: StatusCodes.BAD_REQUEST });
  }
  cookie[OAUTH_STATE_COOKIE].remove();

  const res = await fetch(
    `https://github.com/login/oauth/access_token?grant_type=authorization_code&client_id=${ENV.GITHUB_CLIENT_ID}&client_secret=${ENV.GITHUB_CLIENT_SECRET}&redirect_uri=${encodeURIComponent(ENV.GITHUB_REDIRECT_URI)}&code=${encodeURIComponent(code)}`,
    {
      method: "POST",
      headers: { Accept: "application/json" },
    },
  );

  if (!res.ok) {
    const err = await res.json()
    throw new AppError({ message: JSON.stringify(err), status: StatusCodes.BAD_REQUEST })
  }

  const { access_token } = await res.json()

  const profileRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!profileRes.ok) {
    throw new AppError({ message: "Failed to fetch GitHub profile", status: StatusCodes.BAD_REQUEST });
  }
  const profile = await profileRes.json() as { id?: number; login?: string; name?: string | null; email?: string | null };
  const oauth_id = randomUUIDv7()
  const oauthUser = {
    email: profile.email || "",
    provider_user_id: String(profile.id ?? ""),
    provider: "GITHUB" as const,
    oauth_id,
    is_verified: true,
  }

  const r = await handleOauth(db, oauthUser)

  const url = new URL("/oauth", ENV.FRONTEND_URL);
  url.searchParams.set("token", r.accessToken);
  return redirect(url.toString());
};

export const CreateResetLink = async ({ db, body }: { db: Bun.SQL, body: CreateResetBody }) => {
  try {
    const res = await handleCreateResetLink(db, body);
    return {data : res}
  }
  catch {
    throw new AppError({
      message: "Failed to send password reset link",
      status: 500
    })
  }
}

export const resetPassword = async ({ db, body, headers }: { db: Bun.SQL, body: ResetBody, headers: Record<string, string | undefined> }) => {
  if(!headers.Authorization) throw new AppError({status: StatusCodes.UNAUTHORIZED, message: "Not authenticated"})
  const token = headers.Authorization.split("Bearer ")[1];
  const { password } = body;

  const res = await handleResetPassword(db, { password, token })
  return {data : res}
}
