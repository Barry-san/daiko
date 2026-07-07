import { t } from "elysia";

export const envSchema = t.Object({
  DB_PORT: t.Number(),
  DB_NAME: t.String(),
  DB_USER: t.String(),
  DB_ADAPTER: t.Enum({
    postgres: "postgres",
    mysql: "mysql",
  }),
  DB_PASSWORD: t.String(),

  JWT_SECRET: t.String({
    minLength: 32,
  }),
  JWT_ISSUER: t.String(),

  PORT_NUMBER: t.Number(),

  REDIS_URL: t.String({
    format: "uri",
  }),

  GITHUB_CLIENT_ID: t.String(),
  GITHUB_CLIENT_SECRET: t.String(),
  GITHUB_REDIRECT_URI: t.String({
    format: "uri",
  }),

  RESEND_API_KEY: t.String()
});
