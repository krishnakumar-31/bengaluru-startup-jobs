import { NextRequest, NextResponse } from "next/server";
import { COMMON_HEADERS, isPrerenderInterrupted } from "@/lib/api-serializers";
import { getAuthenticatedAdmin, AuthHttpError } from "@/lib/server-admin-auth";
import { getCandidates } from "@/lib/candidate-verification";

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate Admin
    await getAuthenticatedAdmin(request);

    // 2. Parse Query Parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;
    const limit = parseInt(searchParams.get("limit") || "20", 10) || 20;
    const status = searchParams.get("status");
    const classification = searchParams.get("classification");
    const industry = searchParams.get("industry");
    const locality = searchParams.get("locality");
    const search = searchParams.get("search");
    const excludeRejected = searchParams.get("exclude_rejected") === "true";

    // 3. Query Candidates
    const response = getCandidates({
      page,
      limit,
      status,
      classification,
      industry,
      locality,
      search,
      exclude_rejected: excludeRejected,
    });

    return NextResponse.json(response, {
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
    console.error("Admin list candidates error:", err);
    return NextResponse.json(
      { detail: "Internal server error listing candidate companies." },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}
