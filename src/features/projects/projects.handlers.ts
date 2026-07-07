import type { CreateProject, ProjectProgres, UploadProject } from "@/schemas/project.schema";
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

export const createProject = async ({ user, body, db }: { body: CreateProject; user: string; db: Bun.SQL }) => {
  const { name, content, config } = body as CreateProject;

  const project = { name, content, config };
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
      job: res,
    },
  };
};

export const checkProjectStatus = async ({ params, db }: { params: ProjectProgres; db: Bun.SQL }) => {
  const { projectID } = params;
  const projectStatus = await getProjectStatus(db, projectID)
  console.log(projectStatus)
  return { data: projectStatus }
}
