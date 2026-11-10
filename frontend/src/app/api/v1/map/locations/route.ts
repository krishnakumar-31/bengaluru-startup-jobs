import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  COMMON_HEADERS,
  isPrerenderInterrupted,
} from "@/lib/api-serializers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locality = searchParams.get("locality")?.trim() || null;
    const search = searchParams.get("search")?.trim() || null;
    const skillsParam = searchParams.get("skills")?.trim() || null;

    const skillList = skillsParam
      ? skillsParam
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      : null;
    const searchLower = search ? search.toLowerCase() : null;

    // Fetch approved company offices with verified coordinates
    const offices = await prisma.office.findMany({
      where: {
        company: { isVerified: true },
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
      include: {
        company: true,
        jobs: {
          where: {
            status: "active",
          },
        },
      },
      orderBy: { id: "asc" },
    });

    const results = [];

    for (const office of offices) {
      const comp = office.company;
      if (!comp || !comp.isVerified) continue;

      const activeJobs = office.jobs.filter((j) => j.status === "active");

      // Search filter across company name, industry, locality, address, or job title/skills/description
      if (searchLower) {
        const matchesCompany =
          comp.name.toLowerCase().includes(searchLower) ||
          (comp.industry && comp.industry.toLowerCase().includes(searchLower)) ||
          (office.locality && office.locality.toLowerCase().includes(searchLower)) ||
          (office.address && office.address.toLowerCase().includes(searchLower));

        const matchesJob = activeJobs.some(
          (j) =>
            j.title.toLowerCase().includes(searchLower) ||
            j.description.toLowerCase().includes(searchLower) ||
            (j.skills &&
              j.skills.some((sk) => sk.toLowerCase().includes(searchLower)))
        );

        if (!matchesCompany && !matchesJob) {
          continue;
        }
      }

      // Skills filter
      if (skillList && skillList.length > 0) {
        const matchesSkills = activeJobs.some(
          (j) =>
            j.skills &&
            j.skills.some((sk) =>
              skillList.some((reqS) => sk.toLowerCase().includes(reqS))
            )
        );
        if (!matchesSkills) {
          continue;
        }
      }

      const jobBriefs = activeJobs.map((j) => ({
        id: j.id,
        title: j.title,
        slug: j.slug,
        employment_type: j.employmentType,
        work_mode: j.workMode ?? "in-office",
        experience_level: j.experienceLevel,
        salary_min: j.salaryMin,
        salary_max: j.salaryMax,
        currency: j.currency || "INR",
        vacancies: j.vacancies ?? 1,
        skills: j.skills,
        status: j.status,
      }));

      const totalVacancies = activeJobs.reduce(
        (sum, j) => sum + (j.vacancies ?? 1),
        0
      );

      results.push({
        office_id: office.id,
        office_name: office.name,
        company_id: comp.id,
        company_name: comp.name,
        company_slug: comp.slug,
        company_logo_url: comp.logoUrl,
        industry: comp.industry,
        address: office.address,
        locality: office.locality,
        city: office.city,
        state: office.state,
        postal_code: office.postalCode,
        latitude: office.latitude,
        longitude: office.longitude,
        is_headquarters: office.isHeadquarters,
        is_verified: comp.isVerified,
        has_active_vacancies: activeJobs.length > 0,
        active_jobs_count: activeJobs.length,
        total_vacancies: totalVacancies,
        jobs: jobBriefs,
      });
    }

    return NextResponse.json(results, { headers: COMMON_HEADERS });
  } catch (error) {
    if (isPrerenderInterrupted(error)) throw error;
    console.error("Error in GET /api/v1/map/locations:", error);
    return NextResponse.json(
      { detail: "Internal server error fetching map locations" },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}
