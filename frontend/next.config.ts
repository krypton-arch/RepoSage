import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  output: "standalone",
  // In production with Nginx, Nginx handles proxying to the backend.
  // We keep rewrites for local development when BACKEND_URL is set (or fallback to localhost)
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    return {
      beforeFiles: [
        {
          source: '/api/auth/token/',
          destination: `${backendUrl}/api/auth/token/`,
        },
        {
          source: '/api/auth/register/',
          destination: `${backendUrl}/api/auth/register/`,
        },
      ],
      afterFiles: [],
      fallback: [
        {
          source: '/api/:path*/',
          destination: `${backendUrl}/api/:path*/`,
        },
        {
          source: '/api/:path*',
          destination: `${backendUrl}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
