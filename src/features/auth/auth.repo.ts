import { sql } from "bun";
import { StatusCodes } from "http-status-codes";
import { pg } from "@/db/pgdb";
import { AppError } from "@/lib/error";

type NewUser = {
  user_id: string;
  email: string;
  username: string;
  password_hash: string;
};

export async function createNewUser(newUser: NewUser) {
  try {
    const user = await pg`INSERT into users ${sql(newUser)} RETURNING user_id, email, created_at`;
    return user[0];
  } catch (e) {
    console.log(e);

    throw new AppError({
      message: "Invalid credetials",
      status: StatusCodes.BAD_REQUEST,
    });
  }
}

export async function getUser(email: string) {
  try {
    const user: User[] = await pg`SELECT * from users where email = ${email}`;
    return user[0];
  } catch {
    return null;
  }
}

type User = {
  user_id: string;
  username: string;
  email: string;
  password_hash: string;
  create_at: Date;
  is_verified: boolean;
};
