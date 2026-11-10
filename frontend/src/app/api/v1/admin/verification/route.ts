import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  serializeCompany,
  serializeJob,
  COMMON_HEADERS,
  isPrerenderInterrupted,
} from "@/lib/api-serializers";
import { getAuthenticatedAdmin, AuthHttpError } from "@/lib/server-admin-auth";

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate Admin
    await getAuthenticatedAdmin(request);

    // 2. Query Unverified Companies
    const unverifiedCompanies = await prisma.company.findMany({
      where: { isVerified: false },
      include: {
        offices: {
          orderBy: { id: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    // 3. Query Unverified Jobs (no sources or only empty source URLs)
    const unverifiedJobs = await prisma.job.findMany({
      where: {
        OR: [
          { jobSources: { none: {} } },
          { jobSources: { every: { sourceUrl: "" } } },
        ],
      },
      include: {
        company: true,
        office: true,
        jobSources: true,
      },
      orderBy: { title: "asc" },
    });

    // 4. Query Expired Jobs
    const expiredJobs = await prisma.job.findMany({
      where: { status: "expired" },
      include: {
        company: true,
        office: true,
        jobSources: true,
      },
      orderBy: { title: "asc" },
    });

    return NextResponse.json(
      {
        unverified_companies: unverifiedCompanies.map((c) =>
          serializeCompany(c, c.offices[0] || null)
        ),
        unverified_jobs: unverifiedJobs.map((j) => serializeJob(j)),
        expired_jobs: expiredJobs.map((j) => serializeJob(j)),
      },
      { status: 200, headers: COMMON_HEADERS }
    );
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
    console.error("Admin verification hub error:", err);
    return NextResponse.json(
      { detail: "Internal server error fetching verification hub." },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}
