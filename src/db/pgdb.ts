import { SQL } from "bun";
import { ENV } from "@/lib/env";

export const pg = new SQL({
  adapter: ENV.DB_ADAPTER,
  username: ENV.DB_USER,
  hostname: "localhost",
  port: ENV.DB_PORT,
  database: ENV.DB_NAME,
  password: ENV.DB_PASSWORD,
  onconnect: () => {
    console.log("Connected to database");
  },
});
