import type { CreateProjectBody } from "@daiko/shared";
import { randomUUIDv7 } from "bun";
import { createJob } from "@/lib/jobs";
import { AppError } from "@/lib/error";
import { encryptEnv } from "@/lib/crypto";
import type { Project } from "@/types";
import { createProject, getUserProjects } from "./projects.repo";

export async function getProjects(db: Bun.SQL, userID: string) {
  const projects = await getUserProjects(db, userID);
  return projects;
}

export async function handleNewProject(db: Bun.SQL, params: {
  userID: string;
  project: CreateProjectBody;
}) {
  const project_id = randomUUIDv7();

  if (params.project.source.type === "git") {
    assertGitUrl(params.project.source.url);
  }

  const projectData: Omit<Project, "created_at"> = {
    author: params.userID,
    project_id,
    project_name: params.project.name,
    content: JSON.stringify(params.project.source),
  };

  const projectDetails = {
    ...params.project,
    config: {
      ...params.project.config,
      env: encryptEnv(params.project.config.env),
    },
  };

  const res = await createProject(db, projectData);
  const job = await createJob(db, {
    name: "BUILD",
    projectID: project_id,
    author: params.userID,
    details: JSON.stringify(projectDetails),
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

export function assertGitUrl(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new AppError({ message: "Git repository URL must use https", status: 400 });
  }
  return parsed;
}
