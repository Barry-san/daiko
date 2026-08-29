import Elysia from "elysia";
import { authPlugin } from "@/middleware/authentication";

export const accountRoutes = new Elysia({ prefix: "/accounts" }).use(authPlugin);

accountRoutes.get("/", (_c) => ({
  message: "Hello there!",
}));
