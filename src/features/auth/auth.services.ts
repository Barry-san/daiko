import type {CreateResetBody, LoginBody, SignupBody ,  } from "@daiko/shared";
import Bun, { randomUUIDv7 } from "bun";
import { StatusCodes } from "http-status-codes";
import { jwtVerify, SignJWT } from "jose";
import { createEmailJob } from "@/lib/email";
import { ENV } from "@/lib/env";
import { AppError } from "@/lib/error";
import { handleCreateOTP } from "../otp/otp.services";
import type { OauthUser } from "./auth.repo";
import { createNewUser, createOauthUser, getUser, getUserById, updateUser } from "./auth.repo";
import { createSession, getSession, revokeSession, revokeUserSessions } from "./session.repo";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

async function signAccessToken(user: { user_id: string; is_verified: boolean }) {
  return new SignJWT({ sub: user.user_id, isVerified: user.is_verified })
    .setIssuedAt()
    .setExpirationTime("15min")
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ENV.JWT_ISSUER)
    .sign(new TextEncoder().encode(ENV.JWT_SECRET));
}

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
    const accessToken = await signAccessToken(user);
    const session = await createSession(db, user.user_id, SESSION_TTL_MS);

    return {
      data: {
        id: user.user_id,
        email: user.email,
        isVerified: user.is_verified,
        accessToken,
      },
      refreshToken: session.session_id,
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

export async function handleRefresh(db: Bun.SQL, refreshToken: string) {
  if (!refreshToken) {
    throw new AppError({ status: StatusCodes.UNAUTHORIZED, message: "Log in" });
  }

  const session = await getSession(db, refreshToken);
  const now = new Date();

  if (!session || session.revoked_at || session.expires_at <= now) {
    throw new AppError({ status: StatusCodes.UNAUTHORIZED, message: "Log in" });
  }

  const user = await getUserById(db, session.user_id);
  if (!user || user.deleted_at) {
    throw new AppError({ status: StatusCodes.UNAUTHORIZED, message: "Account is no longer active." });
  }

  const accessToken = await signAccessToken(user);

  // Rotate: revoke the presented session and issue a fresh one (forward secrecy).
  await revokeSession(db, session.session_id);
  const nextSession = await createSession(db, user.user_id, SESSION_TTL_MS);

  return { accessToken, refreshToken: nextSession.session_id };
}

export async function handleOauth(db: Bun.SQL, user: Omit<OauthUser, "created_at">) {
  const [saved] = await createOauthUser(db, user)
  if (!saved.user_id) {
    throw new AppError({ status: StatusCodes.INTERNAL_SERVER_ERROR, message: "Failed to create OAuth user." });
  }
  const accessToken = await signAccessToken({ user_id: saved.user_id, is_verified: saved.is_verified });
  const session = await createSession(db, saved.user_id, SESSION_TTL_MS);

  return { user: saved, accessToken, refreshToken: session.session_id }
}

export async function handleCreateResetLink(db: Bun.SQL, { email }: CreateResetBody) {
  const user = await getUser(db, email.toLowerCase());
  if (!user) return true; // Avoid user enumeration.

  const resetToken = await new SignJWT({ sub: user.user_id })
    .setIssuedAt()
    .setExpirationTime("15min")
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ENV.JWT_ISSUER)
    .sign(new TextEncoder().encode(ENV.JWT_SECRET));

  const email_id = randomUUIDv7()

  await createEmailJob(db, { type: "RESET", content: `${ENV.BASE_URL}/auth/reset?token=${resetToken}`, recipient: email, email_id })
  return true;
}

export async function handleResetPassword(db: Bun.SQL, { password, token }: { password: string, token : string }) {
  const JWT_SECRET = new TextEncoder().encode(ENV.JWT_SECRET)

  try {

    const userId = (await jwtVerify(token, JWT_SECRET)).payload.sub;
    if (!userId) {
      throw new AppError({
        status: StatusCodes.UNAUTHORIZED,
        message : "Invalid token"
      })
    }

    const password_hash = await Bun.password.hash(password, { algorithm: "argon2id" });
    const res = await updateUser(db, userId, { password_hash });
    await revokeUserSessions(db, userId);
    return res
  }
  catch {
    throw new AppError({
      status: StatusCodes.UNAUTHORIZED,
      message: "Invalid token"
    })
  }

}
