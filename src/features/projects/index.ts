import Elysia from "elysia";
import { pg } from "@/db/pgdb";
import { authPlugin } from "@/middleware/authentication";
import { uploadProjectSchema } from "@/schemas/project.schema";
import { createProjectBodySchema, projectProgressParamsSchema } from "@daiko/shared";
import { checkProjectStatus, createProject, fetchUserProjects, uploadProject } from "./projects.handlers";
import { getProject } from "./projects.repo";
import { getDeploymentByProject } from "@/features/deployments/deployments.repo";
import { streamBuildLogs } from "./projects.stream";

export const projectRoutes = new Elysia({ prefix: "/projects" })
  .decorate("db", pg)
  .use(authPlugin)
  .get("/", fetchUserProjects)
  .post("/", createProject, { body: createProjectBodySchema })
  .post("/upload", uploadProject, { body: uploadProjectSchema })
  .get("/status/:projectID", checkProjectStatus, { params: projectProgressParamsSchema })
  .get("/:projectId", async ({ params: { projectId }, db, user }) => {
    const project = await getProject(db, projectId);
    if (!project || project.author !== user) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    }
    const deployment = await getDeploymentByProject(db, projectId);
    return { data: { project, deployment: deployment ?? null } };
  })
  .get("/:projectId/logs/stream", async ({ params: { projectId }, db, user }) => {
    const project = await getProject(db, projectId);
    if (!project || project.author !== user) {
      return new Response("Unauthorized", { status: 401 });
    }
    return streamBuildLogs({ projectId, db });
  })
