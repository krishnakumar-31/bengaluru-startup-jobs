import { NextRequest, NextResponse } from "next/server";
import { COMMON_HEADERS, serializeAdminProfile, isPrerenderInterrupted } from "@/lib/api-serializers";
import { getAuthenticatedAdmin, AuthHttpError } from "@/lib/server-admin-auth";

export async function GET(request: NextRequest) {
  try {
    const { admin } = await getAuthenticatedAdmin(request);
    return NextResponse.json(serializeAdminProfile(admin), {
      status: 200,
      headers: COMMON_HEADERS,
    });
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
    console.error("Admin me route error:", err);
    return NextResponse.json(
      { detail: "Internal server error." },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}
