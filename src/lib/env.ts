import { Value } from "@sinclair/typebox/value";
import { envSchema } from "../schemas/env.schema";

export const ENV = Value.Parse(envSchema, process.env);
