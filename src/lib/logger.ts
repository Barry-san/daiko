import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  ...(isDev && {
    transport: { target: "pino-pretty", options: { colorize: true } },
  }),
  redact: {
    paths: ["req.headers.authorization", "req.body.password", "req.body.refreshToken", "req.body.token"],
    censor: "[REDACTED]",
  },
});
