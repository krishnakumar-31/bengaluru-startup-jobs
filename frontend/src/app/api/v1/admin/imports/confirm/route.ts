import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedAdmin, AuthHttpError } from "@/lib/server-admin-auth";
import { executeUnifiedImport } from "@/lib/unified-import";
import { COMMON_HEADERS, isPrerenderInterrupted } from "@/lib/api-serializers";

/**
 * POST /api/v1/admin/imports/confirm
 * Ingest verified preview records into PostgreSQL database within an atomic interactive transaction.
 */
export async function POST(request: NextRequest) {
  try {
    await getAuthenticatedAdmin(request);

    const contentType = request.headers.get("content-type") || "";
    let rawJson: string | null = null;

    if (contentType.includes("application/json")) {
      let body: Record<string, unknown>;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { detail: "Invalid JSON request payload." },
          { status: 400, headers: COMMON_HEADERS }
        );
      }
      rawJson = (body.raw_accepted_json || body.raw_json_records) as string | null;
    } else {
      let form: FormData;
      try {
        form = await request.formData();
      } catch {
        return NextResponse.json(
          { detail: "Invalid form data payload." },
          { status: 400, headers: COMMON_HEADERS }
        );
      }
      rawJson = (form.get("raw_accepted_json") ||
        form.get("raw_json_records")) as string | null;
    }

    if (!rawJson || typeof rawJson !== "string" || !rawJson.trim()) {
      return NextResponse.json(
        { detail: "Missing accepted records payload" },
        { status: 400, headers: COMMON_HEADERS }
      );
    }

    const confirmResult = await executeUnifiedImport(rawJson);

    return NextResponse.json(confirmResult, {
      status: 200,
      headers: COMMON_HEADERS,
    });
  } catch (err: unknown) {
    if (isPrerenderInterrupted(err)) throw err;
    if (err instanceof AuthHttpError) {
      return NextResponse.json(
        { detail: err.message },
        { status: err.status, headers: COMMON_HEADERS }
      );
    }
    console.error("Admin import confirm error:", err);
    return NextResponse.json(
      {
        detail:
          err instanceof Error
            ? err.message
            : "Database transaction failed during import.",
      },
      { status: 400, headers: COMMON_HEADERS }
    );
  }
}
