/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // In Docker: BACKEND_URL=http://backend:3001
    // In local dev: falls back to localhost
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
