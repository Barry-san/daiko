import type { UnwrapSchema } from "elysia";
import { t } from "elysia";

export const loginBody = t.Object({
  email: t.String({}),
  password: t.String({
    minLength: 6,
  }),
});

export const signupBody = t.Object({
  email: t.String({ format: "email" }),
  password: t.String({
    minLength: 6
  }),
  username: t.String(),
});

export const verifyBody = t.Object({
  OTP: t.String({
    maxLength: 6,
    minLength: 6,
  }),
});

export const refreshCookie = t.Cookie({
  refreshToken: t.String(),
});

export type LoginBody = UnwrapSchema<typeof loginBody>;
export type SignupBody = UnwrapSchema<typeof signupBody>;
export type VerifyBody = UnwrapSchema<typeof verifyBody>;
export type RefreshCookie = UnwrapSchema<typeof refreshCookie>;
