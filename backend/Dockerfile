# Single stage — node-pty native bindings must compile in the runtime environment
FROM node:20-slim

RUN apt-get update && apt-get install -y \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

EXPOSE 3001 3002

CMD ["node", "dist/server.js"]
