import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Next.js 16 : ex-middleware.ts (voir AGENTS.md). Runtime nodejs uniquement.
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const isAppRoute = pathname.startsWith("/app");
  const isLoginRoute = pathname.startsWith("/login");

  if (isAppRoute && !isLoggedIn) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  if (isLoginRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/app", req.nextUrl));
  }
});

export const config = {
  matcher: ["/app/:path*", "/login"],
};
