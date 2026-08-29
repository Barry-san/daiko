import { sql } from "bun";
import { StatusCodes } from "http-status-codes";
import { AppError } from "@/lib/error";
import type { User } from "@/types";

type NewUser = {
  user_id: string;
  email: string;
  username: string;
  password_hash: string;
};

export async function createNewUser(db: Bun.SQL, newUser: NewUser) {
  try {
    const user = await db`INSERT into users ${sql(newUser)} RETURNING user_id, email, created_at`;
    return user[0];
  } catch {
    throw new AppError({
      message: "Invalid credentials",
      status: StatusCodes.BAD_REQUEST,
    });
  }
}

export async function getUser(db: Bun.SQL, email: string) {
  try {
    const user: User[] = await db`SELECT * from users where email = ${email}`;
    return user[0];
  } catch {
    return null;
  }
}

export async function getUserById(db: Bun.SQL, userId: string) {
  try {
    const user: User[] = await db`SELECT * from users where user_id = ${userId}`;
    return user[0] ?? null;
  } catch {
    return null;
  }
}

export async function createOauthUser(db: Bun.SQL, user: Omit<OauthUser, "created_at">) {
  try {
    const res: OauthUser[] = await db`INSERT into oauth_users ${sql(user)} returning *`
    return res;
  }
  catch {
    throw new AppError({
      message: "An error occured, but it's our fault",
      status: 500
    })
  }
}

export async function updateUser(db: Bun.SQL, userId: string, fields: Partial<Omit<User, "user_id">>) {
  const res = await db`UPDATE users SET ${sql(fields)} WHERE user_id = ${userId} RETURNING *`;
  return res;
}

export type OauthUser = {
  oauth_id: string,
  provider_user_id: string,
  provider: OauthProviders
  user_id?: string,
  is_verified: boolean,
  created_at: Date;
}

type OauthProviders = "GITHUB"
