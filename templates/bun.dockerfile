# templates/node.dockerfile
FROM oven/bun:1-slim AS base

WORKDIR /app
COPY package.json bun.lock ./

RUN bun install

COPY . .

{{ENV_VARS}}

EXPOSE 3000

CMD ["bun", "run", "dev"]
