import { NextRequest, NextResponse } from "next/server";
import { COMMON_HEADERS, isPrerenderInterrupted } from "@/lib/api-serializers";
import { getAuthenticatedAdmin, AuthHttpError } from "@/lib/server-admin-auth";
import {
  getCandidateByCin,
  updateCandidateVerification,
  CandidateVerificationStatus,
} from "@/lib/candidate-verification";

interface RouteParams {
  params: Promise<{ cin: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate Admin
    await getAuthenticatedAdmin(request);

    // 2. Parse CIN
    const { cin } = await params;
    if (!cin || !cin.trim()) {
      return NextResponse.json(
        { detail: "CIN parameter is required." },
        { status: 422, headers: COMMON_HEADERS }
      );
    }

    // 3. Find Candidate Company
    const candidate = getCandidateByCin(cin.trim());
    if (!candidate) {
      return NextResponse.json(
        { detail: `Candidate company not found with CIN: ${cin}` },
        { status: 404, headers: COMMON_HEADERS }
      );
    }

    return NextResponse.json(candidate, {
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
    console.error("Admin get candidate error:", err);
    return NextResponse.json(
      { detail: "Internal server error fetching candidate company." },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate Admin & CSRF Validation (automatic on PUT)
    const { admin } = await getAuthenticatedAdmin(request);

    // 2. Parse CIN
    const { cin } = await params;
    if (!cin || !cin.trim()) {
      return NextResponse.json(
        { detail: "CIN parameter is required." },
        { status: 422, headers: COMMON_HEADERS }
      );
    }

    // 3. Parse and Validate Request Body
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { detail: "Invalid JSON in request body." },
        { status: 400, headers: COMMON_HEADERS }
      );
    }

    const validStatuses: CandidateVerificationStatus[] = [
      "Needs Review",
      "Verified",
      "Rejected",
    ];

    if (
      !body ||
      typeof body.verification_status !== "string" ||
      !validStatuses.includes(body.verification_status as CandidateVerificationStatus)
    ) {
      return NextResponse.json(
        {
          detail: [
            {
              loc: ["body", "verification_status"],
              msg: "Input should be 'Needs Review', 'Verified' or 'Rejected'",
              type: "literal_error",
            },
          ],
        },
        { status: 422, headers: COMMON_HEADERS }
      );
    }

    // 4. Update Candidate Verification
    try {
      const updated = updateCandidateVerification(
        cin.trim(),
        {
          verification_status: body.verification_status as CandidateVerificationStatus,
          official_website: typeof body.official_website === "string" ? body.official_website : null,
          evidence_url: typeof body.evidence_url === "string" ? body.evidence_url : null,
          actual_operating_office_address:
            typeof body.actual_operating_office_address === "string"
              ? body.actual_operating_office_address
              : null,
          operating_locality:
            typeof body.operating_locality === "string" ? body.operating_locality : null,
          operating_pincode:
            typeof body.operating_pincode === "string" ? body.operating_pincode : null,
          reviewer_notes:
            typeof body.reviewer_notes === "string" ? body.reviewer_notes : null,
        },
        admin.username
      );

      return NextResponse.json(updated, {
        status: 200,
        headers: COMMON_HEADERS,
      });
    } catch (updateErr: unknown) {
      const errorMsg = updateErr instanceof Error ? updateErr.message : String(updateErr);
      if (errorMsg.includes("Candidate company not found")) {
        return NextResponse.json(
          { detail: `Candidate company not found with CIN: ${cin}` },
          { status: 404, headers: COMMON_HEADERS }
        );
      }
      throw updateErr;
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
    console.error("Admin update candidate error:", err);
    return NextResponse.json(
      { detail: "Internal server error updating candidate verification." },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}
