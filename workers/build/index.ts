import { randomUUIDv7 } from "bun";
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { Readable } from "node:stream";
import Docker from "dockerode";
import postgres from "postgres";
import { extractArchive } from "zip-bun";
import { pg } from "@/db/pgdb";
import { ENV } from "@/lib/env";
import { decryptEnv } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import type { LanguageOptions, ProjectConfig } from "@/types";
import type { ProjectSource } from "@daiko/shared";
import { createDeployment } from "@/features/deployments/deployments.repo";
import type { Job } from "@/lib/jobs";
import { cloneRepo } from "./git";
import { buildDockerFile } from "./utils";
import { cleanupSites, disableSite, enableSite } from "./nginx";

const CHANNEL = "build_queue";const SWEEP_INTERVAL_MS = 60_000;

type JobDetails = {
  name: string,
  source: ProjectSource,
  config: ProjectConfig
}

const LANGUAGE_COMMANDS: Record<LanguageOptions, { buildCommand: string; startCommand: string }> = {
  bun: { buildCommand: "bun install", startCommand: "bun run dev" },
  node: { buildCommand: "npm ci || npm install", startCommand: "npm run dev" },
  go: { buildCommand: "go build -o app .", startCommand: "./app" },
  python: { buildCommand: "pip install -r requirements.txt", startCommand: "python main.py" },
};

type BuildEvent =
  | { type: "log"; line: string; time: number }
  | { type: "status"; status: "running" | "complete" | "failed"; time: number; deployment_url?: string };

function log(...args: unknown[]) {
  logger.info(args.join(" "));
}

async function notifyBuild(jobId: string, event: BuildEvent) {
  const channel = `build_log_${jobId}`;
  try {
    await pg`SELECT pg_notify(${channel}, ${JSON.stringify(event)})`;
  } catch {}
}

async function allocatePort(projectId: string): Promise<number | null> {
  const res = await pg`
    WITH next_port AS (
      SELECT port_number FROM port_allocations
      WHERE status = 'free'
      ORDER BY port_number
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE port_allocations
    SET status = 'allocated', project_id = ${projectId}, allocated_at = NOW()
    WHERE port_number = (SELECT port_number FROM next_port)
    RETURNING port_number
  `;
  return (res).length > 0 ? (res)[0].port_number : null;
}

async function freePort(projectId: string) {
  await pg`
    UPDATE port_allocations
    SET status = 'free', project_id = NULL, allocated_at = NULL
    WHERE project_id = ${projectId} AND status = 'allocated'
  `;
}

async function extractZip(zipPath: string, destDir: string) {
  mkdirSync(destDir, { recursive: true });
  await extractArchive(zipPath, destDir);
}

function cleanMacArtifacts(dir: string) {
  for (const entry of readdirSync(dir)) {
    if (entry === "__MACOSX" || entry === ".DS_Store") {
      rmSync(resolve(dir, entry), { recursive: true, force: true });
    }
  }
}

function flattenSingleRoot(dir: string) {
  const entries = readdirSync(dir);
  if (entries.length !== 1) return;
  const single = resolve(dir, entries[0]);
  if (!statSync(single).isDirectory()) return;
  log(`  Archive: flattening ${entries[0]}...`);
  for (const entry of readdirSync(single)) {
    renameSync(resolve(single, entry), resolve(dir, entry));
  }
  rmSync(single, { recursive: true });
}

function liftSubdir(dir: string, subdir: string) {
  const sub = resolve(dir, subdir);
  if (!statSync(sub).isDirectory()) {
    throw new Error(`subdirectory "${subdir}" not found in repository`);
  }
  for (const entry of readdirSync(sub)) {
    renameSync(resolve(sub, entry), resolve(dir, entry));
  }
  rmSync(sub, { recursive: true });
}

async function processJob(job: Job) {
  let port: number | null = null;
  let projectId = ''
  try {
    const details: JobDetails = JSON.parse(job.details);
    const source = details.source
    projectId = job.project_id;

    const docker = new Docker();
    const imageTag = `project-${projectId}`;
    log(`Processing build job ${projectId}...`);

    await pg`UPDATE jobs SET status = 'running', started_at = NOW() WHERE job_id = ${job.job_id}`;
    await notifyBuild(job.job_id, { type: "status", status: "running", time: Date.now() });

    log(`  Docker: checking connectivity...`);
    await new Promise<void>((resolve, reject) => {
      docker.ping((err: Error | null) => (err ? reject(err) : resolve()));
    });
    log(`  Docker: connected`);

    log(`  Port: allocating...`);
    port = await allocatePort(projectId);
    if (!port) throw new Error("No free port available");
    log(`  Port: allocated → ${port}`);

    const extractPath = resolve(process.cwd(), "deployments", projectId);
    rmSync(extractPath, { recursive: true, force: true });


    if (source.type === "git") {
      log(`  Git: cloning ${source.url}${source.branch ? ` (${source.branch})` : ""}...`);
      await cloneRepo({
        url: source.url,
        branch: source.branch,
        destDir: extractPath,
        onLog: (line) => {
          log(`  Git: ${line}`);
          notifyBuild(job.job_id, { type: "log", line, time: Date.now() });
        },
      });
      log(`  Git: cloned`);
      cleanMacArtifacts(extractPath);
      if (source.subdir) {
        log(`  Git: lifting subdir ${source.subdir}...`);
        liftSubdir(extractPath, source.subdir);
      }
    } else {
      log(`  Archive: extracting...`);
      await extractZip(resolve(process.cwd(), "uploads", source.uri), extractPath);
      log(`  Archive: extracted`);
      cleanMacArtifacts(extractPath);
    }
    flattenSingleRoot(extractPath);

    log(`  Dockerfile: generating...`);
    const commands = LANGUAGE_COMMANDS[details.config.language];
    const dockerfileBytes = await buildDockerFile({
      language: details.config.language,
      config: {
        buildCommand: commands.buildCommand,
        port: port.toString(),
        startCommand: commands.startCommand,
        env: decryptEnv(details.config.env)
      },
    });
    await Bun.write(`${extractPath}/Dockerfile`, dockerfileBytes);
    log(`  Dockerfile: generated`);

    log(`  Image: building...`);
    const result = spawnSync("tar", ["-cf", "-", "-C", extractPath, "."]);
    if (result.status !== 0) throw new Error("tar archive creation failed");
    const tarStream = new Readable({
      read() {
        this.push(result.stdout);
        this.push(null);
      },
    });
    const buildStream = await docker.buildImage(tarStream, {
      t: imageTag,
      dockerfile: "Dockerfile",
    });
    const buildErrors: string[] = [];
    await new Promise<void>((resolvePromise, reject) => {
      docker.modem.followProgress(
        buildStream,
        (err: Error | null, res: any[]) => {
          if (err) return reject(err);
          for (const ev of res ?? []) {
            if (ev?.error) buildErrors.push(ev.error);
            if (ev?.errorDetail?.message)
              buildErrors.push(ev.errorDetail.message);
          }
          resolvePromise();
        },
        (event) => {
          if (event?.stream) {
            const line = event.stream.trim();
            if (line) {
              logger.debug({ stream: line }, "Docker build output");
              notifyBuild(job.job_id, { type: "log", line, time: Date.now() });
            }
          }
          if (event?.error) {
            buildErrors.push(event.error);
            notifyBuild(job.job_id, { type: "log", line: event.error, time: Date.now() });
          }
          if (event?.errorDetail?.message) {
            buildErrors.push(event.errorDetail.message);
            notifyBuild(job.job_id, { type: "log", line: event.errorDetail.message, time: Date.now() });
          }
        },
      );
    });
    if (buildErrors.length > 0) {
      throw new Error(`Docker build failed:\n${buildErrors.join("\n")}`);
    }
    await docker.getImage(imageTag).inspect();
    log(`  Image: built`);

    log(`  Container: creating...`);
    const container = await docker.createContainer({
      Image: imageTag,
      Labels: { "daiko.project": projectId, "daiko.port": port.toString() },
      HostConfig: {
        PortBindings: {
          "3000/tcp": [{ HostPort: port.toString() }],
        },
      },
    });
    await container.start();

    const containerInfo = await container.inspect();
    const containerId = containerInfo.Id;
    log(`  Container: started → ${containerId.slice(0, 12)}`);

    const deploymentUrl = enableSite(details.name, projectId, port);
    log(`  Nginx: site enabled → ${deploymentUrl}`);

    log(`  Deployment: recording...`);
    await createDeployment(pg, {
      deployment_id: randomUUIDv7(),
      project_id: projectId,
      port,
      container_id: containerId,
      deployment_url: deploymentUrl,
    });

    await pg`
      UPDATE jobs SET status = 'complete', completed_at = NOW()
      WHERE job_id = ${job.job_id}
    `;
    await notifyBuild(job.job_id, { type: "status", status: "complete", time: Date.now(), deployment_url: deploymentUrl });

    log(`Done — ${projectId} deployed on port ${port}`);

    if (source.type === "zip") {
      try {
        rmSync(resolve(process.cwd(), "uploads", source.uri));
        log(`  Cleanup: removed upload ${source.uri}`);
      } catch {}
    }

    try {
      rmSync(extractPath, { recursive: true, force: true });
      log(`  Cleanup: removed deployment directory`);
    } catch {}
  } catch (e) {
    log(`Build failed for ${projectId}:`, e);

    if (port) await freePort(projectId);
    disableSite(projectId);

    await pg`
      UPDATE jobs SET status = 'failed' WHERE job_id = ${job.job_id}
    `;
    await notifyBuild(job.job_id, { type: "status", status: "failed", time: Date.now() });
  }
}

async function sweep() {
  const pending = await pg`
    SELECT * FROM jobs WHERE name = 'BUILD' AND status = 'pending'
  `;

  for (const job of pending as Job[]) {
    await processJob(job);
  }

  const failed = await pg`
    SELECT * FROM jobs
    WHERE name = 'BUILD'
      AND status = 'failed'
      AND started_at IS NOT NULL
      AND started_at < NOW() - INTERVAL '5 minutes'
  `;

  for (const job of failed as Job[]) {
    await pg`UPDATE jobs SET status = 'pending' WHERE job_id = ${job.job_id}`;
  }
}

async function cleanupStaleState(docker: Docker) {
  log("Cleanup: removing stale containers...");
  try {
    const containers = await docker.listContainers({
      all: true,
      filters: { label: ["daiko.project"] },
    });
    for (const c of containers) {
      const id = c.Id.slice(0, 12);
      try {
        const container = docker.getContainer(c.Id);
        await container.stop().catch(() => { });
        await container.remove({ force: true });
        log(`Cleanup: removed stale container ${id}`);
      } catch {
        log(`Cleanup: failed to remove container ${id}`);
      }
    }
  } catch {
    log("Cleanup: error listing containers");
  }

  log("Cleanup: freeing stale port allocations...");
  await pg`
    UPDATE port_allocations
    SET status = 'free', project_id = NULL, allocated_at = NULL
    WHERE status = 'allocated'
  `;

  log("Cleanup: removing stale nginx configs...");
  cleanupSites();
}

async function startBuildWorker() {
  log("Starting build worker...");

  const docker = new Docker();
  await cleanupStaleState(docker);

  const listenSql = postgres({
    host: "localhost",
    port: ENV.DB_PORT,
    database: ENV.DB_NAME,
    username: ENV.DB_USER,
    password: ENV.DB_PASSWORD,
  });

  await sweep();

  const meta = await listenSql.listen(CHANNEL, (payload: string) => {
    try {
      const row = JSON.parse(payload) as Job;
      if (row.status === "pending") {
        processJob(row).catch((e) => log("Listener job failed:", e));
      }
    } catch (e) {
      log("Failed to parse notification:", e);
    }
  });

  const sweepInterval = setInterval(sweep, SWEEP_INTERVAL_MS);

  log(`Listening on ${CHANNEL}...`);

  const shutdown = async () => {
    log("Shutting down build worker...");
    clearInterval(sweepInterval);
    meta.unlisten();
    await listenSql.end();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

process.on("unhandledRejection", (reason) => {
  log("Unhandled rejection:", reason);
});

process.on("uncaughtException", (err) => {
  log("Uncaught exception:", err);
});

startBuildWorker().catch((e) => log("Fatal error in worker:", e));
