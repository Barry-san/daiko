import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const NGINX_DIR = resolve(process.cwd(), "nginx");

function ensureDir() {
  mkdirSync(NGINX_DIR, { recursive: true });
}

function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
}

function buildSubdomain(name: string, projectId: string): string {
  const safe = sanitizeName(name);
  const suffix = projectId.replace(/-/g, "").slice(0, 8);
  return `${safe}-${suffix}`;
}

function configFilePath(subdomain: string): string {
  return resolve(NGINX_DIR, `${subdomain}.conf`);
}

export function enableSite(projectName: string, projectId: string, port: number): string {
  ensureDir();
  const subdomain = buildSubdomain(projectName, projectId);
  const deploymentUrl = `http://${subdomain}.localhost`;
  const config = `# daiko.project: ${projectId}
server {
    listen 80;
    server_name ${subdomain}.localhost;

    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
`;
  writeFileSync(configFilePath(subdomain), config, "utf-8");
  return deploymentUrl;
}

export function disableSite(projectId: string) {
  ensureDir();
  const files = readdirSync(NGINX_DIR);
  for (const file of files) {
    if (!file.endsWith(".conf")) continue;
    const content = readFileSync(resolve(NGINX_DIR, file), "utf-8");
    if (content.includes(`daiko.project: ${projectId}`)) {
      rmSync(resolve(NGINX_DIR, file));
      return;
    }
  }
}

export function cleanupSites() {
  ensureDir();
  const files = readdirSync(NGINX_DIR);
  for (const file of files) {
    if (!file.endsWith(".conf")) continue;
    rmSync(resolve(NGINX_DIR, file));
  }
}
