import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeCompanyDetail, COMMON_HEADERS } from "@/lib/api-serializers";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const numericId = parseInt(id, 10);

    const company = await prisma.company.findFirst({
      where: !isNaN(numericId)
        ? { id: numericId }
        : { slug: id },
      include: {
        offices: {
          orderBy: { id: "asc" },
        },
        jobs: {
          orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
        },
      },
    });

    if (!company) {
      return NextResponse.json(
        { detail: `Company with ID ${id} not found` },
        { status: 404, headers: COMMON_HEADERS }
      );
    }

    return NextResponse.json(serializeCompanyDetail(company), {
      headers: COMMON_HEADERS,
    });
  } catch (error) {
    console.error("Error in GET /api/v1/companies/[id]:", error);
    return NextResponse.json(
      { detail: "Internal server error fetching company details" },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}
