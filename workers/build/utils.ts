import type { LanguageOptions } from "@/types";

type DeploymentConfig = {
  buildCommand: string;
  port: string
  startCommand: string,
  env: Record<string, string> | undefined
}

export async function buildDockerFile({ language, config }: { language: LanguageOptions, config: DeploymentConfig }) {
  let template = await Bun.file(`templates/${language}.dockerfile`).text();
  const env = buildEnv(config.env)

  template = template
    .replace("{{BUILD_COMMAND}}", config.buildCommand)
    .replace("{{PORT}}", config.port)
    .replace("{{START_COMMAND}}", config.startCommand)
    .replace("{{ENV_VARS}}", env)

  const encoder = new TextEncoder()
  return encoder.encode(template)
}

function buildEnv(env: Record<string, string> | undefined) {
  if (!env) return ""
  const lines: string[] = []
  for (const key in env) {
    if (/[\r\n]/.test(key) || /[\r\n]/.test(env[key])) {
      throw new Error(`Env var "${key}" contains a newline and was rejected`);
    }
    const value = env[key].replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    lines.push(`ENV ${key}="${value}"`);
  }
  return lines.join("\n")
}
