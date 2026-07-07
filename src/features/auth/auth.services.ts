import Bun, { randomUUIDv7 } from "bun";
import { StatusCodes } from "http-status-codes";
import { jwtVerify, SignJWT } from "jose";
import { ENV } from "@/lib/env";
import { AppError } from "@/lib/error";
import type { LoginBody, SignupBody } from "@/schemas/auth.schema";
import { handleCreateOTP } from "../otp/otp.services";
import type { OauthUser } from "./auth.repo";
import { createNewUser, createOauthUser, getUser } from "./auth.repo";

export async function handleLogin(db: Bun.SQL, params: LoginBody) {
  const user = await getUser(db, params.email.toLowerCase());
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

export async function handleSignup(db: Bun.SQL, { email, password, username }: SignupBody) {
  const user_id = randomUUIDv7();
  const password_hash = await Bun.password.hash(password, { algorithm: "argon2id" });
  const user = await createNewUser(db, {
    user_id,
    password_hash,
    email: email.toLowerCase(),
    username,
  });
  const { data } = await handleLogin(db, { email, password });
  await handleCreateOTP(db, data.id);

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
  } catch {
    throw new AppError({
      status: StatusCodes.UNAUTHORIZED,
      message: "Log in",
    });
  }
}

export async function handleOauth(db: Bun.SQL, user: Omit<OauthUser, "created_at">) {
  const [saved] = await createOauthUser(db, user)
  const accessToken = await new SignJWT({ sub: saved.user_id, is_verified: saved.is_verified })
    .setIssuedAt()
    .setExpirationTime("15min")
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ENV.JWT_ISSUER)
    .sign(new TextEncoder().encode(ENV.JWT_SECRET));

  const refreshToken = await new SignJWT({ sub: saved.user_id, is_verified: saved.is_verified })
    .setIssuedAt()
    .setExpirationTime("30d")
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ENV.JWT_ISSUER)
    .sign(new TextEncoder().encode(ENV.JWT_SECRET));

  return { user: saved, accessToken, refreshToken }
}
