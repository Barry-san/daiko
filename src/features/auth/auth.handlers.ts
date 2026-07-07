import { fetch, randomUUIDv7 } from "bun";
import type { Cookie, Handler } from "elysia";
import { StatusCodes } from "http-status-codes";
import { ENV } from "@/lib/env";
import { AppError } from "@/lib/error";
import type { LoginBody, SignupBody } from "@/schemas/auth.schema";
import { handleLogin, handleOauth, handleRefresh, handleSignup } from "./auth.services";

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

  cookie.refreshToken.value = res.refreshToken;
  cookie.refreshToken.httpOnly = true;

  return { ...res, refreshToken: undefined };
};

export const signupHandler = async ({ body, db }: { body: SignupBody; db: Bun.SQL }) => {
  const user = await handleSignup(db, body);
  return { data: user };
};

export const logoutHandler = ({ cookie }: { cookie: Record<string, Cookie<unknown>> }) => {
  cookie.refreshToken.remove();
};

export const refreshHandler: Handler = async ({
  cookie,
}: {
  cookie: Record<string, Cookie<unknown>>;
}) => {
  const refreshToken = cookie.refreshToken.value;
  const accessToken = await handleRefresh(refreshToken as string);
  return { data: { accessToken } };
};

export const oauthHandler = ({ redirect }: { redirect: (url: string) => Response }) => {
  return redirect(
    `https://github.com/login/oauth/authorize?response_type=code&client_id=${ENV.GITHUB_CLIENT_ID}&state=hello123&redirect_uri=${ENV.GITHUB_REDIRECT_URI}`,
  );
};

export const oauthCallback = async ({ query, db }: { query: Record<string, string>; db: Bun.SQL }) => {
  const { code } = query;
  const res = await fetch(
    `https://github.com/login/oauth/access_token?grant_type=authorization_code&client_id=${ENV.GITHUB_CLIENT_ID}&client_secret=${ENV.GITHUB_CLIENT_SECRET}&redirect_uri=${ENV.GITHUB_REDIRECT_URI}&code=${code}`,
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
  const profile = await profileRes.json() as { id?: number; login?: string; name?: string | null; email?: string | null };
  const oauth_id = randomUUIDv7()
  const oauthUser = {
    email: profile.email || "",
    provider_user_id: String(profile.id ?? ""),
    username: profile.name ?? profile.login ?? "",
    provider: "GITHUB" as const,
    oauth_id,
    is_verified: true,
  }

  const r = await handleOauth(db, oauthUser)

  return { data: r }
};
