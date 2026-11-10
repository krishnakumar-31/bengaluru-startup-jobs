import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  serializeJob,
  COMMON_HEADERS,
  isPrerenderInterrupted,
} from "@/lib/api-serializers";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const rawPage = parseInt(searchParams.get("page") || "1", 10);
    const rawLimit = parseInt(searchParams.get("limit") || "20", 10);
    const rawSkip = searchParams.has("skip")
      ? parseInt(searchParams.get("skip")!, 10)
      : null;

    const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const limit = isNaN(rawLimit) || rawLimit < 1 ? 20 : Math.min(rawLimit, 100);
    const skip = rawSkip !== null && !isNaN(rawSkip) && rawSkip >= 0 ? rawSkip : null;

    const actualSkip = skip !== null ? skip : (page - 1) * limit;
    const actualPage = skip !== null ? Math.floor(skip / limit) + 1 : page;

    const search = searchParams.get("search")?.trim() || null;
    const skillsParam = searchParams.get("skills")?.trim() || null;
    const locality = searchParams.get("locality")?.trim() || null;
    const employmentType = searchParams.get("employment_type")?.trim() || null;
    const experienceLevel = searchParams.get("experience_level")?.trim() || null;
    const company = searchParams.get("company")?.trim() || null;
    const rawCompanyId = searchParams.get("company_id");
    const companyId = rawCompanyId ? parseInt(rawCompanyId, 10) : null;
    const statusParam = searchParams.get("status")?.trim().toLowerCase() || "active";
    const includeExpired = searchParams.get("include_expired") === "true";

    const skillList = skillsParam
      ? skillsParam
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      : null;

    const now = new Date();

    const where: Prisma.JobWhereInput = {
      ...(statusParam !== "all" ? { status: statusParam } : {}),
      ...(!includeExpired
        ? {
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          }
        : {}),
      ...(companyId && !isNaN(companyId) ? { companyId } : {}),
      ...(employmentType
        ? { employmentType: { equals: employmentType, mode: "insensitive" } }
        : {}),
      ...(experienceLevel
        ? { experienceLevel: { equals: experienceLevel, mode: "insensitive" } }
        : {}),
      ...(locality
        ? {
            office: {
              locality: { contains: locality, mode: "insensitive" },
            },
          }
        : {}),
      ...(company
        ? {
            company: {
              OR: [
                { slug: company.toLowerCase() },
                { name: { contains: company, mode: "insensitive" } },
              ],
            },
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
    };

    // If skills filter is present, PostgreSQL array check
    if (skillList && skillList.length > 0) {
      // In PostgreSQL with Prisma, skills is String[]
      // We check if skills array contains any of the requested skills
      where.skills = {
        hasSome: skillList,
      };
    }

    const [total, items] = await Promise.all([
      prisma.job.count({ where }),
      prisma.job.findMany({
        where,
        include: {
          company: true,
          office: true,
          jobSources: true,
        },
        orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
        skip: actualSkip,
        take: limit,
      }),
    ]);

    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    return NextResponse.json(
      {
        items: items.map(serializeJob),
        total,
        page: actualPage,
        limit,
        total_pages: totalPages,
        has_next: actualPage < totalPages,
        has_prev: actualPage > 1,
      },
      { headers: COMMON_HEADERS }
    );
  } catch (error) {
    if (isPrerenderInterrupted(error)) throw error;
    console.error("Error in GET /api/v1/jobs:", error);
    return NextResponse.json(
      { detail: "Internal server error fetching jobs" },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}
