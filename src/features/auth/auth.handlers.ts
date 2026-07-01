import { fetch } from "bun";
import type { Cookie, Handler } from "elysia";
import { ENV } from "@/lib/env";
import type { LoginBody, SignupBody } from "@/schemas/auth.schema";
import { handleLogin, handleRefresh, handleSignup } from "./auth.services";

export const loginHandler = async ({
  body,
  cookie,
}: {
  body: LoginBody;
  cookie: Record<string, Cookie<unknown>>;
}) => {
  const { email, password } = body;
  const res = await handleLogin({ email, password });

  cookie.refreshToken.value = res.refreshToken;
  cookie.refreshToken.httpOnly = true;

  return { ...res, refreshToken: undefined };
};

export const signupHandler = async ({ body }: { body: SignupBody }) => {
  const user = await handleSignup(body);
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
    `https://github.com/login/oauth/authorize?response_type=code&client_id=${ENV.GITHUB_CLIENT_ID}&state=hello123&redirect_uri=http://localhost:3000/auth/oauth/callback`,
  );
};

export const oauthCallback = ({ params }: { params: Record<string, string> }) => {
  const { code } = params;
  const credentials = btoa(`${ENV.GITHUB_CLIENT_ID}:${ENV.GITHUB_CLIENT_SECRET}`);
  const _res = fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: ENV.GITHUB_CLIENT_ID,
      redirect_uri: "http://localhost:3000/auth/oauth/callback",
      code,
    }),
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
};
