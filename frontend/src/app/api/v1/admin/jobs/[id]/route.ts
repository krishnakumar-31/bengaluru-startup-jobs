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

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/admin/jobs/[id]
 * Retrieve detailed job information by ID.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: true,
        office: true,
        jobSources: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        { detail: `Job with ID ${jobId} not found.` },
        { status: 404, headers: COMMON_HEADERS }
      );
    }

    return NextResponse.json(serializeJob(job), {
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
    console.error("Admin get job route error:", err);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}

/**
 * PUT /api/v1/admin/jobs/[id]
 * Update an existing job posting with validation, constraint verification, and CSRF protection.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: true,
        office: true,
        jobSources: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        { detail: `Job with ID ${jobId} not found.` },
        { status: 404, headers: COMMON_HEADERS }
      );
    }

    // Company verification if changing company_id
    let targetCompanyId = job.companyId;
    if (body.company_id !== undefined && body.company_id !== null && body.company_id !== "") {
      const compId = Number(body.company_id);
      if (isNaN(compId)) {
        return NextResponse.json(
          { detail: "Field 'company_id' must be an integer." },
          { status: 422, headers: COMMON_HEADERS }
        );
      }
      const comp = await prisma.company.findUnique({ where: { id: compId } });
      if (!comp) {
        return NextResponse.json(
          { detail: `Company ID ${compId} not found.` },
          { status: 400, headers: COMMON_HEADERS }
        );
      }
      targetCompanyId = compId;
    }

    // Office verification if changing office_id
    let targetOfficeId: number | null = job.officeId;
    if (body.office_id !== undefined) {
      if (body.office_id === null || body.office_id === "") {
        targetOfficeId = null;
      } else {
        const offId = Number(body.office_id);
        if (isNaN(offId)) {
          return NextResponse.json(
            { detail: "Field 'office_id' must be an integer." },
            { status: 422, headers: COMMON_HEADERS }
          );
        }
        const office = await prisma.office.findUnique({ where: { id: offId } });
        if (!office || office.companyId !== targetCompanyId) {
          return NextResponse.json(
            { detail: "Office does not belong to selected company." },
            { status: 400, headers: COMMON_HEADERS }
          );
        }
        targetOfficeId = offId;
      }
    }

    // Salary min/max validation
    const salaryMin =
      body.salary_min !== undefined
        ? (body.salary_min !== null && body.salary_min !== "" ? Number(body.salary_min) : null)
        : job.salaryMin;
    const salaryMax =
      body.salary_max !== undefined
        ? (body.salary_max !== null && body.salary_max !== "" ? Number(body.salary_max) : null)
        : job.salaryMax;

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
      body.experience_min !== undefined
        ? (body.experience_min !== null && body.experience_min !== "" ? Number(body.experience_min) : null)
        : job.experienceMin;
    const expMax =
      body.experience_max !== undefined
        ? (body.experience_max !== null && body.experience_max !== "" ? Number(body.experience_max) : null)
        : job.experienceMax;

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

    // Application URL validation
    let applicationUrl = job.applicationUrl;
    if (body.application_url !== undefined) {
      if (typeof body.application_url === "string" && body.application_url.trim()) {
        const urlCheck = validateWebUrl(body.application_url);
        if (!urlCheck.valid) {
          return NextResponse.json(
            { detail: `Invalid application URL: ${urlCheck.error}` },
            { status: 400, headers: COMMON_HEADERS }
          );
        }
        applicationUrl = body.application_url.trim();
      } else {
        applicationUrl = null;
      }
    }

    // Job Source URL validation
    let jobSourceUrl = job.jobSourceUrl;
    if (body.job_source_url !== undefined) {
      if (typeof body.job_source_url === "string" && body.job_source_url.trim()) {
        const urlCheck = validateWebUrl(body.job_source_url);
        if (!urlCheck.valid) {
          return NextResponse.json(
            { detail: `Invalid job source URL: ${urlCheck.error}` },
            { status: 400, headers: COMMON_HEADERS }
          );
        }
        jobSourceUrl = body.job_source_url.trim();
      } else {
        jobSourceUrl = null;
      }
    }

    // Slug conflict check
    let targetSlug = job.slug;
    if (typeof body.slug === "string" && body.slug.trim()) {
      const cleanSlug = slugify(body.slug.trim());
      const existingSlug = await prisma.job.findFirst({
        where: {
          slug: cleanSlug,
          id: { not: jobId },
        },
      });
      if (existingSlug) {
        return NextResponse.json(
          { detail: `Job with slug '${cleanSlug}' already exists.` },
          { status: 400, headers: COMMON_HEADERS }
        );
      }
      targetSlug = cleanSlug;
    }

    // Duplicate title/office check
    const targetTitle =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : job.title;

    if (body.title !== undefined || body.company_id !== undefined || body.office_id !== undefined) {
      const duplicate = await prisma.job.findFirst({
        where: {
          id: { not: jobId },
          companyId: targetCompanyId,
          title: targetTitle,
          officeId: targetOfficeId,
        },
      });
      if (duplicate) {
        return NextResponse.json(
          {
            detail: "A job with this title already exists for this company and office location.",
          },
          { status: 400, headers: COMMON_HEADERS }
        );
      }
    }

    // Parse skills array if provided
    let skills = job.skills;
    if (body.skills !== undefined) {
      if (Array.isArray(body.skills)) {
        skills = body.skills.map(String).map((s) => s.trim()).filter(Boolean);
      } else if (body.skills === null) {
        skills = [];
      }
    }

    // Perform database update
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        companyId: targetCompanyId,
        officeId: targetOfficeId,
        title: targetTitle,
        slug: targetSlug,
        description:
          typeof body.description === "string" && body.description.trim()
            ? body.description.trim()
            : job.description,
        employmentType:
          typeof body.employment_type === "string" && body.employment_type.trim()
            ? body.employment_type.trim()
            : job.employmentType,
        workMode:
          typeof body.work_mode === "string" && body.work_mode.trim()
            ? body.work_mode.trim()
            : job.workMode,
        vacancies:
          body.vacancies !== undefined && body.vacancies !== ""
            ? Math.max(1, Number(body.vacancies) || 1)
            : job.vacancies,
        experienceLevel:
          typeof body.experience_level === "string"
            ? body.experience_level.trim()
            : job.experienceLevel,
        experienceMin: expMin,
        experienceMax: expMax,
        salaryMin,
        salaryMax,
        currency:
          typeof body.currency === "string" && body.currency.trim()
            ? body.currency.trim()
            : job.currency,
        skills,
        applicationUrl,
        jobSourceUrl,
        status:
          typeof body.status === "string" && body.status.trim()
            ? body.status.trim()
            : job.status,
        expiresAt:
          body.expires_at !== undefined
            ? (body.expires_at ? new Date(body.expires_at as string) : null)
            : job.expiresAt,
      },
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
    console.error("Admin update job route error:", err);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}

/**
 * DELETE /api/v1/admin/jobs/[id]
 * Delete a job posting and its associated source records inside an isolated transaction.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json(
        { detail: `Job with ID ${jobId} not found.` },
        { status: 404, headers: COMMON_HEADERS }
      );
    }

    // Delete job and any associated sources in transaction
    await prisma.$transaction(async (tx) => {
      await tx.jobSource.deleteMany({
        where: { jobId },
      });
      await tx.job.delete({
        where: { id: jobId },
      });
    });

    return NextResponse.json(
      { message: `Job ID ${jobId} deleted successfully.` },
      { status: 200, headers: COMMON_HEADERS }
    );
  } catch (err: unknown) {
    if (isPrerenderInterrupted(err)) throw err;
    if (err instanceof AuthHttpError) {
      return NextResponse.json(
        { detail: err.message },
        { status: err.status, headers: COMMON_HEADERS }
      );
    }
    console.error("Admin delete job route error:", err);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}
