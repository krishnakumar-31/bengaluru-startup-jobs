import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedAdmin, AuthHttpError } from "@/lib/server-admin-auth";
import { validateAndPreviewCsv } from "@/lib/unified-import";
import { COMMON_HEADERS, isPrerenderInterrupted } from "@/lib/api-serializers";

/**
 * POST /api/v1/admin/imports/preview
 * Upload and parse CSV file to preview accepted, duplicate, and invalid records.
 */
export async function POST(request: NextRequest) {
  try {
    await getAuthenticatedAdmin(request);

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { detail: "Invalid multipart form data." },
        { status: 400, headers: COMMON_HEADERS }
      );
    }

    const file = formData.get("file");
    if (!file || typeof file === "string" || !(file instanceof Blob)) {
      return NextResponse.json(
        { detail: "No file uploaded or invalid form field 'file'." },
        { status: 400, headers: COMMON_HEADERS }
      );
    }

    const fileName = (file as File).name || "upload.csv";
    const lowerName = fileName.toLowerCase();
    const isSupported =
      lowerName.endsWith(".csv") ||
      lowerName.endsWith(".tsv") ||
      lowerName.endsWith(".json");

    if (!isSupported) {
      return NextResponse.json(
        { detail: "Only .csv, .tsv and .json files are supported." },
        { status: 400, headers: COMMON_HEADERS }
      );
    }

    // Protect against excessive memory usage (10 MB max)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { detail: "File exceeds maximum size limit of 10MB." },
        { status: 400, headers: COMMON_HEADERS }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { detail: "Uploaded file is empty." },
        { status: 400, headers: COMMON_HEADERS }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    let contentStr: string;
    try {
      contentStr = new TextDecoder("utf-8", { fatal: false }).decode(arrayBuffer);
    } catch {
      contentStr = new TextDecoder("latin1").decode(arrayBuffer);
    }

    const previewResult = await validateAndPreviewCsv(contentStr);

    return NextResponse.json(previewResult, {
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
    console.error("Admin import preview error:", err);
    return NextResponse.json(
      { detail: "Internal server error parsing import file." },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}
