import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

interface JwtPayload {
  sub?: string;
  token_version?: number;
  csrf?: string;
  iat?: number;
  exp?: number;
}

/**
 * Safely parses the payload of a standard 3-part JWT without external libraries.
 */
function parseJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, "=");
    const jsonStr = atob(padded);
    return JSON.parse(jsonStr) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Validates session against the FastAPI backend verification endpoint.
 */
async function validateBackendSession(cookieValue: string): Promise<boolean> {
  try {
    const backendUrl =
      process.env.INTERNAL_BACKEND_URL ||
      process.env.BACKEND_URL ||
      "http://127.0.0.1:8000";

    const res = await fetch(`${backendUrl}/api/v1/admin/auth/me`, {
      headers: {
        Cookie: `admin_session=${cookieValue}`,
      },
      cache: "no-store",
    });

    return res.status === 200;
  } catch {
    return false;
  }
}

function clearSessionCookies(response: NextResponse): void {
  response.cookies.delete("admin_session");
  response.cookies.delete("admin_csrf");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Intercept all /admin routes
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("admin_session");
  const rawToken = sessionCookie?.value?.trim();

  // 1. Completely missing session cookie
  if (!rawToken) {
    if (pathname === "/admin/login") {
      return NextResponse.next();
    }
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Validate token structure and expiration
  const payload = parseJwtPayload(rawToken);
  const nowSec = Math.floor(Date.now() / 1000);

  const isMalformed =
    !payload ||
    typeof payload.sub !== "string" ||
    !payload.sub.trim() ||
    typeof payload.exp !== "number";

  const isExpired = Boolean(
    payload && typeof payload.exp === "number" && payload.exp <= nowSec
  );

  // If token is malformed or expired
  if (isMalformed || isExpired) {
    if (pathname === "/admin/login") {
      const response = NextResponse.next();
      clearSessionCookies(response);
      return response;
    }
    const loginUrl = new URL("/admin/login", request.url);
    if (isExpired) {
      loginUrl.searchParams.set("expired", "1");
    }
    const response = NextResponse.redirect(loginUrl);
    clearSessionCookies(response);
    return response;
  }

  // 3. For /admin/login: if user has an unexpired token, verify with backend before redirecting
  if (pathname === "/admin/login") {
    const isBackendValid = await validateBackendSession(rawToken);
    if (isBackendValid) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    // If backend rejects (e.g. revoked token_version), clear cookies and stay on login
    const response = NextResponse.next();
    clearSessionCookies(response);
    return response;
  }

  // 4. Root /admin or /admin/ redirect
  if (pathname === "/admin" || pathname === "/admin/") {
    const isBackendValid = await validateBackendSession(rawToken);
    if (isBackendValid) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    const loginUrl = new URL("/admin/login", request.url);
    const response = NextResponse.redirect(loginUrl);
    clearSessionCookies(response);
    return response;
  }

  // 5. For protected admin routes (/admin/dashboard/*)
  // Skip full backend roundtrip for router prefetch requests to preserve instant transitions
  const isPrefetch =
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch";

  if (!isPrefetch) {
    const isBackendValid = await validateBackendSession(rawToken);
    if (!isBackendValid) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("expired", "1");
      const response = NextResponse.redirect(loginUrl);
      clearSessionCookies(response);
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
