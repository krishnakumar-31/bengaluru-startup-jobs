import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  serializeJobMap,
  COMMON_HEADERS,
  isPrerenderInterrupted,
} from "@/lib/api-serializers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locality = searchParams.get("locality")?.trim() || null;
    const skillsParam = searchParams.get("skills")?.trim() || null;
    const search = searchParams.get("search")?.trim() || null;
    const statusParam = searchParams.get("status")?.trim().toLowerCase() || "active";
    const includeExpired = searchParams.get("include_expired") === "true";

    const skillList = skillsParam
      ? skillsParam
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      : null;

    const now = new Date();

    const jobs = await prisma.job.findMany({
      where: {
        officeId: { not: null },
        office: {
          latitude: { not: null },
          longitude: { not: null },
          ...(locality
            ? {
                locality: {
                  contains: locality,
                  mode: "insensitive",
                },
              }
            : {}),
        },
        ...(statusParam !== "all" ? { status: statusParam } : {}),
        ...(!includeExpired
          ? {
              OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            }
          : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        company: true,
        office: true,
      },
      orderBy: [{ postedAt: "desc" }, { id: "desc" }],
    });

    let filteredJobs = jobs;
    if (skillList && skillList.length > 0) {
      filteredJobs = jobs.filter((j) =>
        j.skills &&
        j.skills.some((sk) =>
          skillList.some((reqS) => sk.toLowerCase().includes(reqS))
        )
      );
    }

    const results = filteredJobs
      .filter((j) => j.office && j.office.latitude !== null && j.office.longitude !== null && j.company)
      .map((j) =>
        serializeJobMap(
          j as typeof j & {
            company: NonNullable<typeof j.company>;
            office: NonNullable<typeof j.office>;
          }
        )
      );

    return NextResponse.json(results, { headers: COMMON_HEADERS });
  } catch (error) {
    if (isPrerenderInterrupted(error)) throw error;
    console.error("Error in GET /api/v1/jobs/map:", error);
    return NextResponse.json(
      { detail: "Internal server error fetching jobs for map" },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}
