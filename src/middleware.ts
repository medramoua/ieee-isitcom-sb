import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { getToken } from "next-auth/jwt";
import { routing } from "@/i18n/routing";

const intl = createIntlMiddleware(routing);

// Admin pages reachable without a session
const PUBLIC_ADMIN = ["/admin/login", "/admin/forgot-password", "/admin/reset-password"];

export default async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // ---- /admin: not localized, session required (cheap JWT check; real checks are in server code)
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (PUBLIC_ADMIN.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return NextResponse.next();
    }
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production",
    });
    if (!token?.id) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      url.searchParams.set("callbackUrl", `${pathname}${search}`);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // The homepage uses React; static subpages still use locale query parameters.
  let response: NextResponse;
  if (pathname === "/") {
    response = NextResponse.next();
  } else if (pathname === "/fr" || pathname === "/en") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = `?locale=${pathname === "/en" ? "en" : "fr"}`;
    response = NextResponse.rewrite(url);
  } else if (pathname === "/events" || pathname === "/fr/events" || pathname === "/en/events") {
    const url = req.nextUrl.clone();
    url.pathname = "/events.html";
    url.search = `?locale=${pathname === "/en/events" ? "en" : "fr"}`;
    response = NextResponse.rewrite(url);
  } else if (pathname === "/news" || pathname === "/fr/news" || pathname === "/en/news") {
    const url = req.nextUrl.clone();
    url.pathname = "/news.html";
    url.search = `?locale=${pathname === "/en/news" ? "en" : "fr"}`;
    response = NextResponse.rewrite(url);
  } else if (pathname === "/resources" || pathname === "/fr/resources" || pathname === "/en/resources") {
    const url = req.nextUrl.clone();
    url.pathname = "/resources.html";
    url.search = `?locale=${pathname === "/en/resources" ? "en" : "fr"}`;
    response = NextResponse.rewrite(url);
  } else {
    // Other public routes retain next-intl routing for future page implementations.
    response = intl(req);
  }
  const sessionCookieNames = ["next-auth.session-token", "__Secure-next-auth.session-token"];
  for (const cookie of req.cookies.getAll()) {
    if (sessionCookieNames.some((name) => cookie.name === name || cookie.name.startsWith(`${name}.`))) {
      response.cookies.set(cookie.name, "", {
        expires: new Date(0),
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
  }
  return response;
}

export const config = {
  // everything except api, Next internals and files with an extension
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
