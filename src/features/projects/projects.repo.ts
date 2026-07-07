import { sql } from "bun";
import type { Project } from "@/types";

// const pageLimit = 20;

export async function getUserProjects(db: Bun.SQL, userID: string) {
  const projects: Project[] =
    await db`SELECT * from projects where author = ${userID} and deleted_at is NULL `;
  return projects;
}

export async function getProject(db: Bun.SQL, project_id: string) {
  const project: Project[] = await db`SELECT * from projects where project_id = ${project_id}`;
  return project[0];
}

export async function createProject(db: Bun.SQL, projectDetails: Omit<Project, "created_at">) {
  const res = await db`INSERT INTO projects ${sql(projectDetails)} RETURNING *`;
  return (res as Project[])[0];
}

export async function deleteProject(db: Bun.SQL, projectID: string) {
  try {
    await db`UPDATE projects SET deleted_at = NOW() WHERE project_id = ${projectID}`;
    return true;
  } catch {
    return false;
  }
}

export async function getProjectStatus(db: Bun.SQL, projectID: string) {
  try {
    const res = await db`SELECT
      p.project_id, p.name, p.author, j.status, j.created_at
      from projects as p
      INNER JOIN jobs as j
      on jobs.project_id = project.project_id
      where p.project_id = ${projectID} and p.deleted_at is NULL`
    return res;
  }
  catch (e) {
    console.log(e)
    console.log("hello")
  }
}
