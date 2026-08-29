import type { UnwrapSchema } from "elysia";
import { t } from "elysia";

export const uploadProjectSchema = t.Object({
  project: t.File({
    type: "application/*",
    maxSize: "3m",
  }),
});

export type UploadProject = UnwrapSchema<typeof uploadProjectSchema>;
