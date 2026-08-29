import cors from "@elysia/cors";
import { openapi } from "@elysia/openapi";
import { Elysia } from "elysia";
import { StatusCodes } from "http-status-codes";
import { accountRoutes } from "./features/accounts";
import { authRoutes } from "./features/auth";
import { otpRoutes } from "./features/otp";
import { projectRoutes } from "./features/projects";
import { ENV } from "./lib/env";
import { AppError } from "./lib/error";
import { logger } from "./lib/logger";

const requestTimers = new WeakMap<Request, number>();

export const app = new Elysia()
  .get("/", () => "Hello Elysia")
  .use(openapi())
  .onRequest((c) => {
    requestTimers.set(c.request, performance.now());
  })
  .onAfterResponse((c) => {
    const start = requestTimers.get(c.request);
    if (start) {
      const duration = performance.now() - start;
      logger.info({ method: c.request.method, url: c.request.url, status: c.set.status ?? 200, duration: `${duration.toFixed(0)}ms` });
      requestTimers.delete(c.request);
    }
  })
  .onError(({ error, request }) => {
    if (error instanceof AppError) {
      logger.warn({ err: error, path: request.url, status: error.status }, error.message);
      return error.toResponse();
    }
    logger.error({ err: error, path: request.url }, "Unhandled error");
    return new AppError({
      message: "Something went wrong, but it's our fault.",
      status: StatusCodes.INTERNAL_SERVER_ERROR,
    }).toResponse();
  })
  .use(authRoutes)
  .use(otpRoutes)
  .use(accountRoutes)
  .use(projectRoutes)
  .use(cors({
    allowedHeaders: ["Content-Type", "Authorization"],
    origin: ["http://localhost:5173"],
    methods: "*",
    credentials: true,
  }))
  .listen(ENV.PORT_NUMBER);

logger.info({ port: ENV.PORT_NUMBER }, "Elysia started");

export type App = typeof app;
