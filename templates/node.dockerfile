# templates/node.dockerfile
FROM node:20-slim

WORKDIR /app
COPY . .

RUN node install

ENV {{ENV_VARS}}

EXPOSE 3000

CMD {{START_COMMAND}}
