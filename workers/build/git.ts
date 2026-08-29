import { spawn } from "node:child_process";
import { resolve } from "node:path";

const CLONE_TIMEOUT_MS = 60_000;

export async function cloneRepo({
  url,
  branch,
  destDir,
  onLog,
}: {
  url: string;
  branch?: string;
  destDir: string;
  onLog: (line: string) => void;
}) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Git repository URL must use https");
  }

  const args = ["clone", "--depth", "1"];
  if (branch) args.push("--branch", branch);
  args.push(url, resolve(destDir));

  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn("git", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("git clone timed out"));
    }, CLONE_TIMEOUT_MS);

    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      const line = chunk.toString().trim();
      stderr += `${line}\n`;
      if (line) onLog(line);
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`git clone failed (exit ${code}): ${stderr.trim()}`));
      }
    });
  });
}
