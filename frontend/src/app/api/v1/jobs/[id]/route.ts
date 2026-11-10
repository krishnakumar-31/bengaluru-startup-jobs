import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeJob, COMMON_HEADERS } from "@/lib/api-serializers";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const numericId = parseInt(id, 10);

    const job = await prisma.job.findFirst({
      where: !isNaN(numericId)
        ? { id: numericId }
        : { slug: id },
      include: {
        company: true,
        office: true,
        jobSources: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        { detail: `Job with ID ${id} not found` },
        { status: 404, headers: COMMON_HEADERS }
      );
    }

    return NextResponse.json(serializeJob(job), { headers: COMMON_HEADERS });
  } catch (error) {
    console.error("Error in GET /api/v1/jobs/[id]:", error);
    return NextResponse.json(
      { detail: "Internal server error fetching job details" },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}
