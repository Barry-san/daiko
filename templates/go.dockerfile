# templates/node.dockerfile
FROM go-slim

WORKDIR /app
COPY . .

RUN {{BUILD_COMMAND}}

{{ENV_VARS}}

EXPOSE 3000

CMD {{START_COMMAND}}
