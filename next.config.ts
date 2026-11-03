import { type NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
// Vercel injects its review toolbar into preview deployments only.
const toolbar = process.env.VERCEL_ENV === "preview" ? " https://vercel.live" : "";

// 'unsafe-inline' scripts are needed for Next.js hydration without per-request
// nonces (which would make every page dynamic). React escapes all rendered
// text, and no user content is ever injected as HTML.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${toolbar}`,
  `style-src 'self' 'unsafe-inline'${toolbar}`,
  `img-src 'self' data: blob: https://lh3.googleusercontent.com${toolbar}`,
  `font-src 'self'${toolbar}`,
  `connect-src 'self'${isDev ? " ws:" : ""}${toolbar}${toolbar ? " wss://ws-us3.pusher.com" : ""}`,
  `frame-src 'self'${toolbar}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },
  serverExternalPackages: ["@prisma/adapter-pg", "pg"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
