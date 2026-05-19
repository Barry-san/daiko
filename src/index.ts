import { openapi } from "@elysia/openapi"
import { Elysia } from "elysia";
import { authRoutes } from "./features/auth ";
import { ENV } from "./lib/env";

const app = new Elysia()
  .get("/", () => "Hello Elysia")
  .use(openapi())
  .listen(ENV.PORT_NUMBER);

app.use(authRoutes)

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

app.onError(({ error, status }) => {
  return error
})
