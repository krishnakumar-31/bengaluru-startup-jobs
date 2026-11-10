import { NextRequest, NextResponse } from "next/server";
import { COMMON_HEADERS, isPrerenderInterrupted } from "@/lib/api-serializers";
import { getAuthenticatedAdmin, AuthHttpError } from "@/lib/server-admin-auth";
import { promoteCandidateToDb } from "@/lib/candidate-verification";

interface RouteParams {
  params: Promise<{ cin: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate Admin & CSRF Validation (automatic on POST)
    await getAuthenticatedAdmin(request);

    // 2. Parse CIN
    const { cin } = await params;
    if (!cin || !cin.trim()) {
      return NextResponse.json(
        { detail: "CIN parameter is required." },
        { status: 422, headers: COMMON_HEADERS }
      );
    }

    // 3. Promote Candidate to PostgreSQL
    try {
      const result = await promoteCandidateToDb(cin.trim());
      return NextResponse.json(result, {
        status: 200,
        headers: COMMON_HEADERS,
      });
    } catch (promoteErr: unknown) {
      const errorMsg = promoteErr instanceof Error ? promoteErr.message : String(promoteErr);
      if (errorMsg.includes("Candidate company not found")) {
        return NextResponse.json(
          { detail: `Candidate company not found with CIN: ${cin}` },
          { status: 404, headers: COMMON_HEADERS }
        );
      }
      if (errorMsg.includes("must be marked 'Verified'")) {
        return NextResponse.json(
          { detail: errorMsg },
          { status: 400, headers: COMMON_HEADERS }
        );
      }
      console.error("Admin candidate promote error:", promoteErr);
      return NextResponse.json(
        {
          detail: errorMsg || "Internal server error promoting candidate company.",
        },
        { status: 500, headers: COMMON_HEADERS }
      );
    }
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
    console.error("Admin promote candidate error:", err);
    return NextResponse.json(
      { detail: "Internal server error promoting candidate company." },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}
