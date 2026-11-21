import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "qira_session";
const PROTECTED_PREFIXES = ["/qrs", "/studio", "/batch", "/analytics"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE_NAME)?.value);

  // Root `/` always sends to `/login` (or `/qrs` if the user wants, but `/login` handles active session nicely)
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/qrs/:path*", "/studio/:path*", "/batch/:path*", "/analytics/:path*"],
};
