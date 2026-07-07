import Elysia from "elysia";
import { pg } from "@/db/pgdb";
import { authPlugin } from "@/middleware/authentication";
import { CreateProjectSchema, projectProgressSchema, uploadProjectSchema } from "@/schemas/project.schema";
import { checkProjectStatus, createProject, fetchUserProjects, uploadProject } from "./projects.handlers";

export const projectRoutes = new Elysia({ prefix: "/projects" })
  .decorate("db", pg)
  .use(authPlugin)
  .get("/", fetchUserProjects)
  .post("/", createProject, { body: CreateProjectSchema })
  .post("/upload", uploadProject, { body: uploadProjectSchema })
  .get("/status/:projectID", checkProjectStatus, { params: projectProgressSchema })
