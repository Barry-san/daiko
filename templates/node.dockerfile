FROM node:20-slim

WORKDIR /app
COPY package*.json ./

RUN npm ci || npm install

COPY . .

{{ENV_VARS}}

EXPOSE 3000

CMD {{START_COMMAND}}
