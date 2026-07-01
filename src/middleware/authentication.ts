import { Elysia } from "elysia";
import { StatusCodes } from "http-status-codes";
import { jwtVerify } from "jose";
import { ENV } from "@/lib/env";
import { AppError } from "@/lib/error";

export const authPlugin = new Elysia({ name: "auth" }).derive({ as: "scoped" }, async (c) => {
  const authorization = c.request.headers.get("Authorization");
  const token = authorization?.split("Bearer ")[1];

  if (!token) {
    throw new AppError({
      message: "You don't have permission to access this resource",
      status: StatusCodes.UNAUTHORIZED,
    });
  }

  try {
    const secret = new TextEncoder().encode(ENV.JWT_SECRET);
    const res = await jwtVerify(token, secret);
    return { user: res.payload.sub as string };
  } catch {
    throw new AppError({
      message: "Refresh or Login.",
      status: StatusCodes.UNAUTHORIZED,
    });
  }
});
