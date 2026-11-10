import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  serializeCompany,
  COMMON_HEADERS,
  isPrerenderInterrupted,
} from "@/lib/api-serializers";
import { getAuthenticatedAdmin, AuthHttpError } from "@/lib/server-admin-auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate Admin & Validate CSRF
    await getAuthenticatedAdmin(request);

    // 2. Parse Company ID
    const { id } = await params;
    const companyId = parseInt(id, 10);
    if (isNaN(companyId)) {
      return NextResponse.json(
        { detail: "Invalid company ID. Must be an integer." },
        { status: 422, headers: COMMON_HEADERS }
      );
    }

    // 3. Verify Existing Company
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return NextResponse.json(
        { detail: `Company with ID ${companyId} not found.` },
        { status: 404, headers: COMMON_HEADERS }
      );
    }

    // 4. Toggle Verification
    const updated = await prisma.company.update({
      where: { id: companyId },
      data: { isVerified: !company.isVerified },
      include: {
        offices: { orderBy: { id: "asc" } },
      },
    });

    return NextResponse.json(serializeCompany(updated, updated.offices[0] || null), {
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
    console.error("Admin toggle company verification error:", err);
    return NextResponse.json(
      { detail: "Internal server error toggling verification." },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}
