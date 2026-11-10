import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedAdmin, AuthHttpError } from "@/lib/server-admin-auth";
import { getTemplateCsv } from "@/lib/unified-import";
import { COMMON_HEADERS, isPrerenderInterrupted } from "@/lib/api-serializers";

/**
 * GET /api/v1/admin/imports/template
 * Download standardized CSV import template with headers and realistic sample rows.
 */
export async function GET(request: NextRequest) {
  try {
    await getAuthenticatedAdmin(request);

    const csvContent = getTemplateCsv();

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        ...COMMON_HEADERS,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="startup_jobs_import_template.csv"',
      },
    });
  } catch (err: unknown) {
    if (isPrerenderInterrupted(err)) throw err;
    if (err instanceof AuthHttpError) {
      return NextResponse.json(
        { detail: err.message },
        { status: err.status, headers: COMMON_HEADERS }
      );
    }
    console.error("Admin import template error:", err);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}
