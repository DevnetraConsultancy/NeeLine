import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

// Edge-safe auth instance (no Prisma) so the middleware bundle stays small.
const { auth } = NextAuth(authConfig);

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Blocks cross-site writes to the API. Browsers always send Origin on
 * cross-origin POST/PATCH/DELETE; Sec-Fetch-Site covers the rest. Requests
 * with neither header do not come from a browser, so cookies are not at risk.
 * Auth.js routes have their own CSRF token and are skipped.
 */
function isCrossSiteWrite(req: Request, host: string | null): boolean {
  if (SAFE_METHODS.has(req.method)) return false;
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host !== host;
    } catch {
      return true;
    }
  }
  const site = req.headers.get("sec-fetch-site");
  return site !== null && site !== "same-origin" && site !== "none";
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = Boolean(req.auth);

  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    if (isCrossSiteWrite(req, req.headers.get("host"))) {
      return NextResponse.json({ error: "Cross-site requests are not allowed." }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (pathname === "/" && isLoggedIn) return NextResponse.redirect(new URL("/dashboard", req.url));
  const isProtected = pathname.startsWith("/dashboard") || pathname.startsWith("/timeline");
  if (isProtected && !isLoggedIn) return NextResponse.redirect(new URL("/", req.url));

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|opengraph-image).*)"],
};
