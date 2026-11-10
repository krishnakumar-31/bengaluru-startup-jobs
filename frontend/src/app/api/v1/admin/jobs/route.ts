import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedAdmin,
  AuthHttpError,
} from "@/lib/server-admin-auth";
import {
  serializeJob,
  COMMON_HEADERS,
  slugify,
  validateWebUrl,
  isPrerenderInterrupted,
} from "@/lib/api-serializers";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/v1/admin/jobs
 * List jobs with pagination, search, and filtering for admin dashboard.
 */
export async function GET(request: NextRequest) {
  try {
    await getAuthenticatedAdmin(request);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20)
    );
    const search = searchParams.get("search");
    const companyIdParam = searchParams.get("company_id");
    const localityParam = searchParams.get("locality");
    const employmentTypeParam = searchParams.get("employment_type");
    const workModeParam = searchParams.get("work_mode");
    const statusParam =
      searchParams.get("status") || searchParams.get("status_filter");

    const where: Prisma.JobWhereInput = {};

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { slug: { contains: term, mode: "insensitive" } },
        { company: { name: { contains: term, mode: "insensitive" } } },
      ];
    }

    if (companyIdParam) {
      const parsedCompanyId = parseInt(companyIdParam, 10);
      if (!isNaN(parsedCompanyId)) {
        where.companyId = parsedCompanyId;
      }
    }

    if (localityParam && localityParam.trim()) {
      where.office = {
        locality: { contains: localityParam.trim(), mode: "insensitive" },
      };
    }

    if (employmentTypeParam && employmentTypeParam !== "all") {
      where.employmentType = {
        contains: employmentTypeParam.trim(),
        mode: "insensitive",
      };
    }

    if (workModeParam && workModeParam !== "all") {
      where.workMode = workModeParam.trim();
    }

    if (statusParam && statusParam !== "all") {
      where.status = statusParam.trim();
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          company: true,
          office: true,
          jobSources: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.job.count({ where }),
    ]);

    const totalPages = total > 0 ? Math.ceil(total / limit) : 1;

    return NextResponse.json(
      {
        items: jobs.map(serializeJob),
        total,
        page,
        limit,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
      { headers: COMMON_HEADERS }
    );
  } catch (err: unknown) {
    if (isPrerenderInterrupted(err)) throw err;
    if (err instanceof AuthHttpError) {
      return NextResponse.json(
        { detail: err.message },
        { status: err.status, headers: COMMON_HEADERS }
      );
    }
    console.error("Admin list jobs route error:", err);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}

/**
 * POST /api/v1/admin/jobs
 * Create a new job posting with full validation, relation checks, and duplicate detection.
 */
export async function POST(request: NextRequest) {
  try {
    await getAuthenticatedAdmin(request);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { detail: "Invalid JSON request payload." },
        { status: 422, headers: COMMON_HEADERS }
      );
    }

    // Required field validation
    if (body.company_id === undefined || body.company_id === null || body.company_id === "") {
      return NextResponse.json(
        { detail: "Field 'company_id' is required." },
        { status: 422, headers: COMMON_HEADERS }
      );
    }
    const companyId = Number(body.company_id);
    if (isNaN(companyId)) {
      return NextResponse.json(
        { detail: "Field 'company_id' must be a valid integer." },
        { status: 422, headers: COMMON_HEADERS }
      );
    }

    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { detail: "Field 'title' is required." },
        { status: 422, headers: COMMON_HEADERS }
      );
    }
    const title = body.title.trim();

    if (!body.description || typeof body.description !== "string" || !body.description.trim()) {
      return NextResponse.json(
        { detail: "Field 'description' is required." },
        { status: 422, headers: COMMON_HEADERS }
      );
    }
    const description = body.description.trim();

    // Verify company existence
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      return NextResponse.json(
        { detail: `Company with ID ${companyId} does not exist.` },
        { status: 400, headers: COMMON_HEADERS }
      );
    }

    // Verify office association if office_id provided
    let office = null;
    if (body.office_id !== undefined && body.office_id !== null && body.office_id !== "") {
      const officeId = Number(body.office_id);
      if (isNaN(officeId)) {
        return NextResponse.json(
          { detail: "Field 'office_id' must be a valid integer." },
          { status: 422, headers: COMMON_HEADERS }
        );
      }
      office = await prisma.office.findUnique({ where: { id: officeId } });
      if (!office || office.companyId !== company.id) {
        return NextResponse.json(
          {
            detail: `Office ID ${officeId} does not belong to company '${company.name}' (ID ${company.id}).`,
          },
          { status: 400, headers: COMMON_HEADERS }
        );
      }
    }

    // Salary min/max validation
    const salaryMin =
      body.salary_min !== undefined && body.salary_min !== null && body.salary_min !== ""
        ? Number(body.salary_min)
        : null;
    const salaryMax =
      body.salary_max !== undefined && body.salary_max !== null && body.salary_max !== ""
        ? Number(body.salary_max)
        : null;

    if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
      return NextResponse.json(
        { detail: "Minimum salary cannot exceed maximum salary." },
        { status: 400, headers: COMMON_HEADERS }
      );
    }
    if ((salaryMin !== null && salaryMin < 0) || (salaryMax !== null && salaryMax < 0)) {
      return NextResponse.json(
        { detail: "Salary cannot be negative." },
        { status: 400, headers: COMMON_HEADERS }
      );
    }

    // Experience min/max validation
    const expMin =
      body.experience_min !== undefined && body.experience_min !== null && body.experience_min !== ""
        ? Number(body.experience_min)
        : null;
    const expMax =
      body.experience_max !== undefined && body.experience_max !== null && body.experience_max !== ""
        ? Number(body.experience_max)
        : null;

    if (expMin !== null && expMax !== null && expMin > expMax) {
      return NextResponse.json(
        { detail: "Minimum experience cannot exceed maximum experience." },
        { status: 400, headers: COMMON_HEADERS }
      );
    }
    if ((expMin !== null && expMin < 0) || (expMax !== null && expMax < 0)) {
      return NextResponse.json(
        { detail: "Experience cannot be negative." },
        { status: 400, headers: COMMON_HEADERS }
      );
    }

    // URL validations
    const applicationUrl =
      typeof body.application_url === "string" ? body.application_url.trim() : null;
    if (applicationUrl) {
      const urlCheck = validateWebUrl(applicationUrl);
      if (!urlCheck.valid) {
        return NextResponse.json(
          { detail: `Invalid application URL: ${urlCheck.error}` },
          { status: 400, headers: COMMON_HEADERS }
        );
      }
    }

    const sourceUrl =
      typeof body.source_url === "string" ? body.source_url.trim() : null;
    if (sourceUrl) {
      const urlCheck = validateWebUrl(sourceUrl);
      if (!urlCheck.valid) {
        return NextResponse.json(
          { detail: `Invalid source URL: ${urlCheck.error}` },
          { status: 400, headers: COMMON_HEADERS }
        );
      }
    }

    const jobSourceUrl =
      typeof body.job_source_url === "string"
        ? body.job_source_url.trim()
        : sourceUrl;
    if (jobSourceUrl && jobSourceUrl !== sourceUrl) {
      const urlCheck = validateWebUrl(jobSourceUrl);
      if (!urlCheck.valid) {
        return NextResponse.json(
          { detail: `Invalid job source URL: ${urlCheck.error}` },
          { status: 400, headers: COMMON_HEADERS }
        );
      }
    }

    // Duplicate check: unique index on (company_id, title, office_id)
    const duplicate = await prisma.job.findFirst({
      where: {
        companyId: company.id,
        title,
        officeId: office ? office.id : null,
      },
    });
    if (duplicate) {
      return NextResponse.json(
        {
          detail: `A job with title '${title}' already exists for company '${company.name}' at this location.`,
        },
        { status: 400, headers: COMMON_HEADERS }
      );
    }

    // Slug resolution and collision avoidance
    let finalSlug =
      typeof body.slug === "string" && body.slug.trim()
        ? slugify(body.slug.trim())
        : `${company.slug}-${slugify(title)}`;
    if (!finalSlug) {
      finalSlug = `${company.slug}-job-${Date.now()}`;
    }

    const existingSlug = await prisma.job.findUnique({
      where: { slug: finalSlug },
    });
    if (existingSlug) {
      finalSlug = `${finalSlug}-${Math.floor(Date.now() / 1000)}`;
    }

    // Parse skills array
    let skills: string[] = [];
    if (Array.isArray(body.skills)) {
      skills = body.skills
        .map(String)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    // Create inside transaction to link job source if present
    const createdJob = await prisma.$transaction(async (tx) => {
      const job = await tx.job.create({
        data: {
          companyId: company.id,
          officeId: office ? office.id : null,
          title,
          slug: finalSlug,
          description,
          employmentType:
            typeof body.employment_type === "string" && body.employment_type.trim()
              ? body.employment_type.trim()
              : "full-time",
          workMode:
            typeof body.work_mode === "string" && body.work_mode.trim()
              ? body.work_mode.trim()
              : "in-office",
          vacancies:
            body.vacancies !== undefined && body.vacancies !== ""
              ? Math.max(1, Number(body.vacancies) || 1)
              : 1,
          experienceLevel:
            typeof body.experience_level === "string" && body.experience_level.trim()
              ? body.experience_level.trim()
              : "mid",
          experienceMin: expMin,
          experienceMax: expMax,
          salaryMin,
          salaryMax,
          currency:
            typeof body.currency === "string" && body.currency.trim()
              ? body.currency.trim()
              : "INR",
          skills,
          applicationUrl: applicationUrl || null,
          jobSourceUrl: jobSourceUrl || null,
          status:
            typeof body.status === "string" && body.status.trim()
              ? body.status.trim()
              : "active",
          postedAt: body.posted_at ? new Date(body.posted_at as string) : new Date(),
          expiresAt: body.expires_at ? new Date(body.expires_at as string) : null,
        },
        include: {
          company: true,
          office: true,
          jobSources: true,
        },
      });

      if (sourceUrl) {
        await tx.jobSource.create({
          data: {
            jobId: job.id,
            sourceName: "admin_entry",
            sourceUrl,
            lastVerifiedAt: new Date(),
          },
        });

        return tx.job.findUniqueOrThrow({
          where: { id: job.id },
          include: { company: true, office: true, jobSources: true },
        });
      }

      return job;
    });

    return NextResponse.json(serializeJob(createdJob), {
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
    console.error("Admin create job route error:", err);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}
