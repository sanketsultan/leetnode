/** @type {import('next').NextConfig} */
const nextConfig = {
  // No rewrites needed — nginx handles all routing:
  //   /api/auth/*  →  Next.js (port 3000) for NextAuth
  //   /api/*       →  Express backend (port 3001)
  // Server-side fetches in api.ts use BACKEND_URL directly.
  // Client-side fetches use relative /api/ which nginx routes.
};

export default nextConfig;
