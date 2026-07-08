import { randomUUIDv7, sql } from "bun";

export type JobName = "BUILD" | "EMAIL";
export type JobStatus = "pending" | "running" | "failed" | "complete";

export type Job = {
  job_id: string;
  project_id: string;
  name: JobName;
  details: string;
  created_at: Date;
  author: string;
  status: JobStatus;
  started_at: Date | null;
  completed_at: Date | null;
};

type CreateJob = {
  name: JobName;
  details: string;
  author: string;
  status: JobStatus;
  projectID: string
};

export async function createJob(db: Bun.SQL, { name, details, author, projectID }: CreateJob) {
  const job_id = randomUUIDv7();
  const job = {
    name,
    details,
    job_id,
    author,
    status: "pending",
    project_id: projectID
  };

  return await db`INSERT into jobs ${sql(job)} returning *`;
}

export async function getJobs(db: Bun.SQL, { name, status }: { name: JobName; status: JobStatus }) {
  return db`SELECT * from jobs where name = ${name} and status = ${status}`;
}
