import { t } from "elysia"

export const envSchema = t.Object({
  DB_PORT: t.Number(),
  DB_NAME: t.String(),
  DB_USER: t.String(),
  DB_ADAPTER: t.Enum({
    postgres: "postgres",
    mysql: "mysql"
  }),
  DB_PASSWORD: t.String(),

  PORT_NUMBER: t.Number(),

  REDIS_URL: t.String({
    format: "uri"
  })
})
