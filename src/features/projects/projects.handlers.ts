import type { CreateProjectBody, ProjectProgressParams } from "@daiko/shared";
import type { UploadProject } from "@/schemas/project.schema";
import { getProjectStatus } from "./projects.repo";
import { getProjects, handleNewProject, handleProjectUpload } from "./projects.services";

export const fetchUserProjects = async ({ user, db }: { user: string; db: Bun.SQL }) => {
  const projects = await getProjects(db, user);
  return {
    data: {
      projects,
    },
  };
};

export const createProject = async ({ user, body, db }: { body: CreateProjectBody; user: string; db: Bun.SQL }) => {
  const { name, source, config } = body as CreateProjectBody;

  const project = { name, source, config };
  const res = await handleNewProject(db, {
    userID: user,
    project,
  });

  return {
    data: {
      project: res,
    },
  };
};

export const uploadProject = async ({ body }: { body: UploadProject; user: string; db: Bun.SQL }) => {
  const { project } = body;
  const res = await handleProjectUpload({ project });

  return {
    data: {
      ...res,
    },
  };
};

export const checkProjectStatus = async ({ params, db }: { params: ProjectProgressParams; db: Bun.SQL }) => {
  const { projectID } = params;
  const projectStatus = await getProjectStatus(db, projectID)
  console.log(projectStatus)
  return { data: projectStatus }
}
