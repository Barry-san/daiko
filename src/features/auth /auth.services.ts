import Bun, { randomUUIDv7 } from "bun"
import { StatusCodes } from "http-status-codes"
import { AppError } from "../../lib/error"
import { createNewUser, getUser } from "./auth.repo"

export async function handleLogin(params: { email: string, password: string }) {
  const user = await getUser(params.email.toLowerCase())
  if (!user) throw new AppError({
    message: "Invalid credentials",
    status: StatusCodes.BAD_REQUEST
  })
  const isVerified = await Bun.password.verify(
    params.password,
    user.password_hash,
    "argon2id",
  )
  if (!isVerified) {
    throw new AppError({
      message: "invalid credentials",
      status: StatusCodes.BAD_REQUEST
    })
  }

  else
    return {
      data: {
        id: user.user_id,
        email: user.email
      }
    }

}



export async function handleSignup(params: { email: string, password: string }) {

  const user_id = randomUUIDv7();
  const password_hash = Bun.password.hashSync(params.password, { algorithm: "argon2id" });
  const user = await createNewUser({
    user_id,
    password_hash,
    email: params.email.toLowerCase()
  })

  return user
}


export async function handleRefresh(refreshToken: string) { }

export async function handleLogout() {
}
