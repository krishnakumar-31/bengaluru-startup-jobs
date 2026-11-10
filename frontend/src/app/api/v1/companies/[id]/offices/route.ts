import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeOffice, COMMON_HEADERS } from "@/lib/api-serializers";

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
      },
    });

    if (!company) {
      return NextResponse.json(
        { detail: `Company with ID ${id} not found` },
        { status: 404, headers: COMMON_HEADERS }
      );
    }

    return NextResponse.json(company.offices.map(serializeOffice), {
      headers: COMMON_HEADERS,
    });
  } catch (error) {
    console.error("Error in GET /api/v1/companies/[id]/offices:", error);
    return NextResponse.json(
      { detail: "Internal server error fetching company offices" },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}
