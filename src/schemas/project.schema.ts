import type { UnwrapSchema } from "elysia";
import { t } from "elysia";

export const CreateProjectSchema = t.Object({
  name: t.String({
    minLength: 3,
  }),
  content: t.String(),

  config: t.Object({
    language: t.Enum({
      bun: "bun",
      go: "go",
      node: "node",
      python: "python"
    }),
    env: t.Optional(t.Record(t.String(), t.String()))
  })
});

export const uploadProjectSchema = t.Object({
  project: t.File({
    type: "application/*",
    maxSize: "3m",
  }),
});

export const projectProgressSchema = t.Object({
  projectID: t.String()
})

export type CreateProject = UnwrapSchema<typeof CreateProjectSchema>;
export type UploadProject = UnwrapSchema<typeof uploadProjectSchema>;
export type ProjectProgres = UnwrapSchema<typeof projectProgressSchema>
