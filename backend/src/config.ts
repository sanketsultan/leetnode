import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  WS_PORT: parseInt(process.env.WS_PORT || '3002', 10),
  SESSION_TTL_MS: parseInt(process.env.SESSION_TTL_MS || '1800000', 10),
  MAX_SESSIONS: parseInt(process.env.MAX_SESSIONS || '10', 10),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  WS_PUBLIC_URL: process.env.WS_PUBLIC_URL || 'ws://localhost:3002',
  PROBLEMS_DIR: path.join(__dirname, '../..', 'problems'),
  DOCKER_SOCKET: process.env.DOCKER_SOCKET || getDockerSocket(),
};

function getDockerSocket(): string {
  // Docker Desktop on Mac uses a different socket path
  const homedir = process.env.HOME || '/root';
  const macSocket = `${homedir}/.docker/run/docker.sock`;
  const linuxSocket = '/var/run/docker.sock';

  try {
    require('fs').accessSync(macSocket);
    return macSocket;
  } catch {
    return linuxSocket;
  }
}
