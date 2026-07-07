import { randomUUIDv7 } from "bun";
import { createJob } from "@/lib/jobs";
import type { CreateProject } from "@/schemas/project.schema";
import type { Project } from "@/types";
import { createProject, getUserProjects } from "./projects.repo";

export async function getProjects(db: Bun.SQL, userID: string) {
  const projects = await getUserProjects(db, userID);
  return projects;
}

export async function handleNewProject(db: Bun.SQL, params: {
  userID: string;
  project: CreateProject;
}) {
  const project_id = randomUUIDv7();

  const projectData: Omit<Project, "created_at"> = {
    author: params.userID,
    project_id,
    project_name: params.project.name,
    content: params.project.content,
  };

  const projectDetails = params.project
  const encoder = new TextEncoder()

  a

  const env: Record<string, string> | undefined = projectDetails.config.env;

  if (env) {
    for (const i in env) {
      console.log(env[i])
    }
  }

  const res = await createProject(db, projectData);
  const job = await createJob(db, {
    name: "BUILD",
    projectID: project_id,
    author: params.userID,
    details: JSON.stringify(params.project),
    status: "pending"
  })
  return { ...res, ...job };
}

export async function fetchUserProjects(db: Bun.SQL, userID: string) {
  const projects = await getUserProjects(db, userID);
  return projects;
}

export async function handleProjectDelete(_projectID: string) { }

export async function handleProjectUpload({ project }: { project: File }) {
  const project_id = randomUUIDv7();
  await Bun.write(`uploads/${project_id}.zip`, project);

  return { upload_uri: `${project_id}.zip` };
}
