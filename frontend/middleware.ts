import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/magic-link",
  "/politica-de-privacidade",
  "/termos-de-uso"
];

export function middleware(request: NextRequest) {
  // Do not protect static assets from /public (e.g. logo files).
  if (/\.[a-zA-Z0-9]+$/.test(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  // API routes are handled by route handlers and should not be redirected by page middleware.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_ROUTES.some((route) => request.nextUrl.pathname.startsWith(route));
  const hasSession = Boolean(request.cookies.get("crm_session")?.value);

  if (!isPublic && !hasSession) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (isPublic && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
