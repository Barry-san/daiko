import Bun, { randomUUIDv7 } from "bun";
import { StatusCodes } from "http-status-codes";
import { jwtVerify, SignJWT } from "jose";
import { ENV } from "@/lib/env";
import { AppError } from "@/lib/error";
import type { LoginBody, SignupBody } from "@/schemas/auth.schema";
import { handleCreateOTP } from "../otp/otp.services";
import { createNewUser, getUser } from "./auth.repo";

export async function handleLogin(params: LoginBody) {
  const user = await getUser(params.email.toLowerCase());
  console.log(user);
  if (!user)
    throw new AppError({
      message: "Invalid credentials",
      status: StatusCodes.BAD_REQUEST,
    });
  const isVerified = await Bun.password.verify(params.password, user.password_hash, "argon2id");
  if (!isVerified) {
    throw new AppError({
      message: "invalid credentials",
      status: StatusCodes.BAD_REQUEST,
    });
  } else {
    console.log("user : ", user);
    const accessToken = await new SignJWT({ sub: user.user_id, isVerified: user.is_verified })
      .setIssuedAt()
      .setExpirationTime("15min")
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(ENV.JWT_ISSUER)
      .sign(new TextEncoder().encode(ENV.JWT_SECRET));

    const refreshToken = await new SignJWT({ sub: user.user_id, isVerified: user.is_verified })
      .setIssuedAt()
      .setExpirationTime("30d")
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(ENV.JWT_ISSUER)
      .sign(new TextEncoder().encode(ENV.JWT_SECRET));

    return {
      data: {
        id: user.user_id,
        email: user.email,
        isVerified: user.is_verified,
        accessToken,
      },
      refreshToken,
    };
  }
}

export async function handleSignup({ email, password, username }: SignupBody) {
  const user_id = randomUUIDv7();
  const password_hash = Bun.password.hashSync(password, { algorithm: "argon2id" });
  const user = await createNewUser({
    user_id,
    password_hash,
    email: email.toLowerCase(),
    username,
  });
  const { data } = await handleLogin({ email, password });
  await handleCreateOTP(data.id);

  return { user, ...data };
}

export async function handleRefresh(refreshToken: string) {
  const secret = new TextEncoder().encode(ENV.JWT_SECRET);
  try {
    const res = await jwtVerify(refreshToken, secret);
    const accessToken = await new SignJWT({ ...res.payload })
      .setProtectedHeader({ alg: "HS256" })
      .sign(secret);
    return accessToken;
  } catch (_e) {
    throw new AppError({
      status: StatusCodes.UNAUTHORIZED,
      message: "Log in",
    });
  }
}
