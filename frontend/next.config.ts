import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/auth/token/',
          destination: 'http://localhost:8000/api/auth/token/',
        },
        {
          source: '/api/auth/register/',
          destination: 'http://localhost:8000/api/auth/register/',
        },
      ],
      afterFiles: [],
      fallback: [
        {
          source: '/api/:path*/',
          destination: 'http://localhost:8000/api/:path*/',
        },
        {
          source: '/api/:path*',
          destination: 'http://localhost:8000/api/:path*',
        },
      ],
    };
  },
};

export default nextConfig;
