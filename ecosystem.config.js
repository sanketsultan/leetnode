// PM2 process manager config for production.
// Usage:
//   pm2 start ecosystem.config.js
//   pm2 save && pm2 startup   (auto-start on reboot)

module.exports = {
  apps: [
    {
      name: 'leetnode-backend',
      cwd: './backend',
      script: 'node',
      args: 'dist/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        WS_PORT: 3002,
        // Update these for your domain:
        FRONTEND_URL: 'https://yourdomain.com',
        WS_PUBLIC_URL: 'wss://yourdomain.com/ws',
        SESSION_TTL_MS: 1800000,   // 30 min
        MAX_SESSIONS: 20,
        DOCKER_SOCKET: '/var/run/docker.sock',
      },
      instances: 1,               // single instance — Docker socket is not thread-safe
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: 'logs/backend-error.log',
      out_file: 'logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'leetnode-frontend',
      cwd: './frontend',
      script: 'node',
      args: 'node_modules/.bin/next start -p 3000',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // PostHog key — get yours at posthog.com (free)
        NEXT_PUBLIC_POSTHOG_KEY: '',
        NEXT_PUBLIC_POSTHOG_HOST: 'https://us.i.posthog.com',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: 'logs/frontend-error.log',
      out_file: 'logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
