import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const REF_COOKIE = "ref";
const REF_PATTERN = /^[A-Z0-9]{1,16}$/i;

// Next.js 16 : ex-middleware.ts (voir AGENTS.md). Runtime nodejs uniquement.
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname, searchParams } = req.nextUrl;
  const isAppRoute = pathname.startsWith("/app");
  const isLoginRoute = pathname.startsWith("/login");

  let response: NextResponse;

  if (isAppRoute && !isLoggedIn) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("from", pathname);
    response = NextResponse.redirect(url);
  } else if (isLoginRoute && isLoggedIn) {
    response = NextResponse.redirect(new URL("/app", req.nextUrl));
  } else {
    response = NextResponse.next();
  }

  // Parrainage (Sprint 5) : /login?ref=CODE pose un cookie lu par getCurrentUser()
  // pour attribuer le filleul au premier login réussi.
  const ref = searchParams.get("ref");
  if (isLoginRoute && ref && REF_PATTERN.test(ref)) {
    response.cookies.set(REF_COOKIE, ref.toUpperCase(), {
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      sameSite: "lax",
    });
  }

  return response;
});

export const config = {
  matcher: ["/app/:path*", "/login"],
};
