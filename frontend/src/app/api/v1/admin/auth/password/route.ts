import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COMMON_HEADERS, isPrerenderInterrupted } from "@/lib/api-serializers";
import {
  AUTH_CONFIG,
  getAuthenticatedAdmin,
  verifyPassword,
  hashPassword,
  generateCsrfToken,
  createAccessToken,
  AuthHttpError,
} from "@/lib/server-admin-auth";

export async function PUT(request: NextRequest) {
  try {
    // 1. Authenticate admin & validate CSRF
    const { admin } = await getAuthenticatedAdmin(request);

    // 2. Parse request body
    const body = await request.json().catch(() => null);
    if (
      !body ||
      typeof body.current_password !== "string" ||
      typeof body.new_password !== "string"
    ) {
      return NextResponse.json(
        { detail: "Current password and new password are required." },
        { status: 422, headers: COMMON_HEADERS }
      );
    }

    const { current_password, new_password } = body;

    // 3. Validate new password length
    if (new_password.length < 6) {
      return NextResponse.json(
        { detail: "New password must be at least 6 characters." },
        { status: 422, headers: COMMON_HEADERS }
      );
    }

    // 4. Verify current password
    if (!verifyPassword(current_password, admin.hashedPassword)) {
      return NextResponse.json(
        { detail: "Current password verification failed." },
        { status: 400, headers: COMMON_HEADERS }
      );
    }

    // 5. Hash new password and increment token_version to invalidate all prior sessions
    const updatedAdmin = await prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        hashedPassword: hashPassword(new_password),
        tokenVersion: { increment: 1 },
      },
    });

    // 6. Issue fresh session with updated token_version
    const newCsrf = generateCsrfToken();
    const newToken = await createAccessToken(
      updatedAdmin.username,
      updatedAdmin.tokenVersion,
      newCsrf
    );

    const response = NextResponse.json(
      {
        message: "Password changed successfully. All other sessions have been revoked.",
        csrf_token: newCsrf,
      },
      { status: 200, headers: COMMON_HEADERS }
    );

    // Set updated HttpOnly session cookie
    response.cookies.set({
      name: AUTH_CONFIG.cookieName,
      value: newToken,
      httpOnly: true,
      secure: AUTH_CONFIG.secure,
      sameSite: AUTH_CONFIG.sameSite,
      maxAge: AUTH_CONFIG.maxAge,
      path: AUTH_CONFIG.path,
    });

    // Set updated readable CSRF cookie
    response.cookies.set({
      name: AUTH_CONFIG.csrfCookieName,
      value: newCsrf,
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
    console.error("Password change route error:", err);
    return NextResponse.json(
      { detail: "Internal server error during password update." },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}
