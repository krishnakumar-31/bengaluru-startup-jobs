import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COMMON_HEADERS } from "@/lib/api-serializers";

export async function GET() {
  try {
    const [approvedCompanies, officeLocations, activeJobs, totalVacanciesAgg] =
      await Promise.all([
        prisma.company.count({
          where: { isVerified: true },
        }),
        prisma.office.count({
          where: {
            company: { isVerified: true },
            latitude: { not: null },
            longitude: { not: null },
          },
        }),
        prisma.job.count({
          where: {
            company: { isVerified: true },
            status: "active",
          },
        }),
        prisma.job.aggregate({
          where: {
            company: { isVerified: true },
            status: "active",
          },
          _sum: { vacancies: true },
        }),
      ]);

    const rawVacancies = totalVacanciesAgg._sum.vacancies ?? 0;
    const totalVacancies =
      activeJobs > 0 && rawVacancies < activeJobs ? activeJobs : rawVacancies;

    return NextResponse.json(
      {
        total_approved_companies: approvedCompanies,
        total_office_locations: officeLocations,
        active_job_openings: activeJobs,
        total_vacancies: totalVacancies,
      },
      { headers: COMMON_HEADERS }
    );
  } catch (error) {
    console.error("Error in GET /api/v1/stats/public:", error);
    return NextResponse.json(
      { detail: "Internal server error fetching public statistics" },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}
