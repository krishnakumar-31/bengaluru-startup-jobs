import { NextRequest, NextResponse } from "next/server";
import { COMMON_HEADERS, isPrerenderInterrupted } from "@/lib/api-serializers";
import {
  AUTH_CONFIG,
  getAuthenticatedAdmin,
  AuthHttpError,
} from "@/lib/server-admin-auth";

export async function POST(request: NextRequest) {
  try {
    // Enforce authentication & CSRF check
    await getAuthenticatedAdmin(request);

    const response = NextResponse.json(
      { message: "Logged out successfully." },
      { status: 200, headers: COMMON_HEADERS }
    );

    // Clear session cookies
    response.cookies.set({
      name: AUTH_CONFIG.cookieName,
      value: "",
      httpOnly: true,
      secure: AUTH_CONFIG.secure,
      sameSite: AUTH_CONFIG.sameSite,
      maxAge: 0,
      expires: new Date(0),
      path: AUTH_CONFIG.path,
    });

    response.cookies.set({
      name: AUTH_CONFIG.csrfCookieName,
      value: "",
      httpOnly: false,
      secure: AUTH_CONFIG.secure,
      sameSite: AUTH_CONFIG.sameSite,
      maxAge: 0,
      expires: new Date(0),
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
    console.error("Logout route error:", err);
    return NextResponse.json(
      { detail: "Internal server error during logout." },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}
