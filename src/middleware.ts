import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

// A separate, lightweight NextAuth instance built ONLY from the edge-safe
// config (no Prisma, no adapter). This keeps the middleware bundle small
// enough for Vercel's Edge Runtime.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname === "/";
  const isApiAuth = pathname.startsWith("/api/auth");
  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/timeline");

  if (isApiAuth) {
    return NextResponse.next();
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
