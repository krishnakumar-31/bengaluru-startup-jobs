import { NextRequest, NextResponse } from "next/server";
import { COMMON_HEADERS, isPrerenderInterrupted } from "@/lib/api-serializers";
import { getAuthenticatedAdmin, AuthHttpError } from "@/lib/server-admin-auth";
import { computeSummary } from "@/lib/candidate-verification";

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate Admin
    await getAuthenticatedAdmin(request);

    // 2. Compute Summary
    const summary = computeSummary();

    return NextResponse.json(summary, {
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
    console.error("Admin candidate summary error:", err);
    return NextResponse.json(
      { detail: "Internal server error computing candidate summary." },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}
