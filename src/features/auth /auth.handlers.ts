
import type { Handler } from "elysia"
import type { LoginBody, SignupBody } from "../../schemas/auth.schema";
import { handleLogin, handleSignup } from "./auth.services";


export const loginHandler: Handler = async ({ body }) => {
  const { email, password } = body as LoginBody;
  const res = await handleLogin({ email, password });
  return res;
}

export const signupHandler: Handler = async ({ body }) => {
  const { password, email } = body as SignupBody;
  const user = await handleSignup({ email, password })
  return { data: user }
}

export const logoutHandler: Handler = (c) => { }

export const refreshHandler: Handler = (c) => { }

export const oauthHandler: Handler = (c) => { }
