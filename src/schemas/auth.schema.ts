import type { Static } from "@sinclair/typebox/type"
import { t } from "elysia";

export const loginBody = t.Object(
  {
    email: t.String({}),
    password: t.String({
      minLength: 6,
    })
  }
)


export const signupBody = t.Object({
  email: t.String({ format: "email" }),
  password: t.String(),
  username: t.String()
})


export type LoginBody = Static<typeof loginBody>
export type SignupBody = Static<typeof signupBody>
