import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  serializeCompany,
  serializeCompanyDetail,
  COMMON_HEADERS,
  slugify,
  isPrerenderInterrupted,
} from "@/lib/api-serializers";
import { getAuthenticatedAdmin, AuthHttpError } from "@/lib/server-admin-auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate Admin
    await getAuthenticatedAdmin(request);

    // 2. Parse Company ID
    const { id } = await params;
    const companyId = parseInt(id, 10);
    if (isNaN(companyId)) {
      return NextResponse.json(
        { detail: "Invalid company ID. Must be an integer." },
        { status: 422, headers: COMMON_HEADERS }
      );
    }

    // 3. Query Company with offices and jobs
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        offices: {
          orderBy: { id: "asc" },
        },
        jobs: {
          orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
        },
      },
    });

    if (!company) {
      return NextResponse.json(
        { detail: `Company with ID ${companyId} not found.` },
        { status: 404, headers: COMMON_HEADERS }
      );
    }

    return NextResponse.json(serializeCompanyDetail(company), {
      status: 200,
      headers: COMMON_HEADERS,
    });
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
    console.error("Admin get company error:", err);
    return NextResponse.json(
      { detail: "Internal server error fetching company." },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate Admin & Validate CSRF
    await getAuthenticatedAdmin(request);

    // 2. Parse Company ID
    const { id } = await params;
    const companyId = parseInt(id, 10);
    if (isNaN(companyId)) {
      return NextResponse.json(
        { detail: "Invalid company ID. Must be an integer." },
        { status: 422, headers: COMMON_HEADERS }
      );
    }

    // 3. Verify Existing Company
    const existingCompany = await prisma.company.findUnique({
      where: { id: companyId },
      include: { offices: { orderBy: { id: "asc" } } },
    });

    if (!existingCompany) {
      return NextResponse.json(
        { detail: `Company with ID ${companyId} not found.` },
        { status: 404, headers: COMMON_HEADERS }
      );
    }

    // 4. Parse Body Updates
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { detail: "Invalid JSON update payload." },
        { status: 422, headers: COMMON_HEADERS }
      );
    }

    const updateData: Prisma.CompanyUpdateInput = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json(
          { detail: "Company name cannot be blank." },
          { status: 422, headers: COMMON_HEADERS }
        );
      }
      updateData.name = body.name.trim();
    }

    if (body.slug !== undefined) {
      if (typeof body.slug !== "string" || !body.slug.trim()) {
        return NextResponse.json(
          { detail: "Slug cannot be blank when provided." },
          { status: 422, headers: COMMON_HEADERS }
        );
      }
      const newSlug = slugify(body.slug);
      if (!newSlug) {
        return NextResponse.json(
          { detail: "Invalid slug format." },
          { status: 422, headers: COMMON_HEADERS }
        );
      }

      // Check slug uniqueness against other companies
      const duplicateSlug = await prisma.company.findFirst({
        where: {
          slug: newSlug,
          id: { not: companyId },
        },
      });

      if (duplicateSlug) {
        return NextResponse.json(
          { detail: `Company with slug '${newSlug}' already exists.` },
          { status: 400, headers: COMMON_HEADERS }
        );
      }

      updateData.slug = newSlug;
    }

    if (body.cin !== undefined) {
      updateData.cin = typeof body.cin === "string" && body.cin.trim() ? body.cin.trim() : null;
    }
    if (body.description !== undefined) {
      updateData.description = typeof body.description === "string" ? body.description.trim() : null;
    }
    if (body.website !== undefined) {
      updateData.website = typeof body.website === "string" && body.website.trim() ? body.website.trim() : null;
    }
    if (body.email !== undefined) {
      updateData.email = typeof body.email === "string" && body.email.trim() ? body.email.trim() : null;
    }
    if (body.phone !== undefined) {
      updateData.phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;
    }
    if (body.logo_url !== undefined) {
      updateData.logoUrl = typeof body.logo_url === "string" && body.logo_url.trim() ? body.logo_url.trim() : null;
    }
    if (body.industry !== undefined) {
      updateData.industry = typeof body.industry === "string" && body.industry.trim() ? body.industry.trim() : null;
    }
    if (body.company_size !== undefined) {
      updateData.companySize = typeof body.company_size === "string" && body.company_size.trim() ? body.company_size.trim() : null;
    }
    if (body.founded_year !== undefined) {
      updateData.foundedYear =
        typeof body.founded_year === "number" && !isNaN(body.founded_year)
          ? Math.floor(body.founded_year)
          : null;
    }
    if (body.is_verified !== undefined) {
      updateData.isVerified = Boolean(body.is_verified);
    }

    // 5. Save Changes
    const updated = await prisma.company.update({
      where: { id: companyId },
      data: updateData,
      include: {
        offices: { orderBy: { id: "asc" } },
      },
    });

    return NextResponse.json(serializeCompany(updated, updated.offices[0] || null), {
      status: 200,
      headers: COMMON_HEADERS,
    });
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
    console.error("Admin update company error:", err);
    return NextResponse.json(
      { detail: "Internal server error updating company." },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate Admin & Validate CSRF
    await getAuthenticatedAdmin(request);

    // 2. Parse Company ID
    const { id } = await params;
    const companyId = parseInt(id, 10);
    if (isNaN(companyId)) {
      return NextResponse.json(
        { detail: "Invalid company ID. Must be an integer." },
        { status: 422, headers: COMMON_HEADERS }
      );
    }

    // 3. Verify Existing Company
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return NextResponse.json(
        { detail: `Company with ID ${companyId} not found.` },
        { status: 404, headers: COMMON_HEADERS }
      );
    }

    // 4. Delete Protection Check
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    const [officesCount, jobsCount] = await Promise.all([
      prisma.office.count({ where: { companyId } }),
      prisma.job.count({ where: { companyId } }),
    ]);

    if ((officesCount > 0 || jobsCount > 0) && !force) {
      return NextResponse.json(
        {
          detail: `Protected record: Company '${company.name}' has ${officesCount} office(s) and ${jobsCount} job(s). Please reassign or remove dependent records first, or confirm force delete.`,
        },
        { status: 400, headers: COMMON_HEADERS }
      );
    }

    // 5. Execute Safe Deletion (Cascade handles dependent records if force=true)
    await prisma.company.delete({
      where: { id: companyId },
    });

    return NextResponse.json(
      { message: `Company ID ${companyId} deleted successfully.` },
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
    console.error("Admin delete company error:", err);
    return NextResponse.json(
      { detail: "Internal server error deleting company." },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}
