import { type NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  // Allow Google OAuth avatar images
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  // Externalize server-only packages to avoid bundling issues
  serverExternalPackages: [
    "@prisma/adapter-pg",
    "pg",
  ],
};

export default nextConfig;
