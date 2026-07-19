import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    return new NextResponse("APP_PASSWORD is not set", { status: 500 });
  }

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (cookie && cookie === (await sessionToken(password))) {
    return NextResponse.next();
  }

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Everything except: the login page, the login API, next internals,
     * and PWA/static assets (manifest, sw, icons).
     */
    "/((?!login|api/login|_next|manifest\\.webmanifest|sw\\.js|apple-touch-icon\\.png|icon-192\\.png|icon-512\\.png|favicon\\.ico).*)",
  ],
};
