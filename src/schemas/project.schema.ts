import type { UnwrapSchema } from "elysia";
import { t } from "elysia";

export const CreateProjectSchema = t.Object({
  name: t.String({
    minLength: 3,
  }),
  content: t.String(),
});

export const uploadProjectSchema = t.Object({
  project: t.File({
    type: "application/*",
    maxSize: "3m",
  }),
});

export type CreateProject = UnwrapSchema<typeof CreateProjectSchema>;
export type UploadProject = UnwrapSchema<typeof uploadProjectSchema>;
