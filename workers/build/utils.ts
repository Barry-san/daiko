type LanguageOptions = "node" | "go" | "python" | "bun";

type DeploymentConfig = {
  buildCommand: string;
  port: string
  startCommand: string,
  env: Record<string, string> | undefined
}

export async function buildDockerFile({ language, config }: { language: LanguageOptions, config: DeploymentConfig }) {
  let template = await Bun.file(`templates/${language}.dockerfile`).text();
  const env = buildEnv(config.env)
  console.log("the env : ", env)

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
  let envString = `ENV `
  for (const i in env) {
    envString += `${i}=${env[i]} `
  }
  return envString
}
