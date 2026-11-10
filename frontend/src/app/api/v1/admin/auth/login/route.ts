import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COMMON_HEADERS, isPrerenderInterrupted } from "@/lib/api-serializers";
import {
  AUTH_CONFIG,
  getClientIp,
  checkLoginRateLimit,
  recordLoginFailure,
  clearLoginFailures,
  verifyPassword,
  generateCsrfToken,
  createAccessToken,
  AuthHttpError,
} from "@/lib/server-admin-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.username !== "string" || typeof body.password !== "string") {
      return NextResponse.json(
        { detail: "Invalid request payload. Username and password are required." },
        { status: 422, headers: COMMON_HEADERS }
      );
    }

    const username = body.username.trim();
    const password = body.password;
    const clientIp = getClientIp(request);
    const rateLimitKey = `${clientIp}:${username}`;

    // 1. Rate limiting check
    checkLoginRateLimit(rateLimitKey);

    // 2. Query admin user from database
    const admin = await prisma.adminUser.findUnique({
      where: { username },
    });

    // 3. Verify user exists, is active, and password matches
    if (!admin || !admin.isActive || !verifyPassword(password, admin.hashedPassword)) {
      recordLoginFailure(rateLimitKey);
      return NextResponse.json(
        { detail: "Invalid administrator credentials." },
        { status: 401, headers: COMMON_HEADERS }
      );
    }

    // 4. Successful login: reset rate limiter
    clearLoginFailures(rateLimitKey);

    // 5. Update last_login_at
    const updatedAdmin = await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    // 6. Generate cryptographic CSRF token & JWT access token
    const csrfToken = generateCsrfToken();
    const token = await createAccessToken(
      updatedAdmin.username,
      updatedAdmin.tokenVersion,
      csrfToken
    );

    // 7. Formulate response with cookies
    const response = NextResponse.json(
      {
        username: updatedAdmin.username,
        csrf_token: csrfToken,
        token_type: "bearer",
        message: "Super administrator login successful.",
      },
      { status: 200, headers: COMMON_HEADERS }
    );

    // Set HttpOnly session cookie
    response.cookies.set({
      name: AUTH_CONFIG.cookieName,
      value: token,
      httpOnly: true,
      secure: AUTH_CONFIG.secure,
      sameSite: AUTH_CONFIG.sameSite,
      maxAge: AUTH_CONFIG.maxAge,
      path: AUTH_CONFIG.path,
    });

    // Set readable CSRF cookie
    response.cookies.set({
      name: AUTH_CONFIG.csrfCookieName,
      value: csrfToken,
      httpOnly: false,
      secure: AUTH_CONFIG.secure,
      sameSite: AUTH_CONFIG.sameSite,
      maxAge: AUTH_CONFIG.maxAge,
      path: AUTH_CONFIG.path,
    });

    return response;
  } catch (err: unknown) {
    if (isPrerenderInterrupted(err)) {
      throw err;
    }
    if (err instanceof AuthHttpError) {
      return NextResponse.json(
        { detail: err.message },
        { status: err.status, headers: COMMON_HEADERS }
      );
    }
    console.error("Login route error:", err);
    return NextResponse.json(
      { detail: "Internal server error during authentication." },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}
