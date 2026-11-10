import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedAdmin,
  AuthHttpError,
} from "@/lib/server-admin-auth";
import {
  serializeJob,
  COMMON_HEADERS,
  isPrerenderInterrupted,
} from "@/lib/api-serializers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const ALLOWED_STATUSES = new Set(["active", "expired", "closed"]);

/**
 * PATCH /api/v1/admin/jobs/[id]/status
 * Update the status of an existing job posting (active, expired, closed).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await getAuthenticatedAdmin(request);

    const { id } = await params;
    const jobId = parseInt(id, 10);
    if (isNaN(jobId)) {
      return NextResponse.json(
        { detail: "Invalid job ID. Must be an integer." },
        { status: 422, headers: COMMON_HEADERS }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { detail: "Invalid JSON request payload." },
        { status: 422, headers: COMMON_HEADERS }
      );
    }

    if (!body.status || typeof body.status !== "string" || !ALLOWED_STATUSES.has(body.status.trim())) {
      return NextResponse.json(
        { detail: "Status must be one of: active, expired, closed" },
        { status: 422, headers: COMMON_HEADERS }
      );
    }

    const newStatus = body.status.trim();

    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json(
        { detail: `Job with ID ${jobId} not found.` },
        { status: 404, headers: COMMON_HEADERS }
      );
    }

    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: { status: newStatus },
      include: {
        company: true,
        office: true,
        jobSources: true,
      },
    });

    return NextResponse.json(serializeJob(updatedJob), {
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
    console.error("Admin set job status route error:", err);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}
