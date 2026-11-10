import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  serializeCompany,
  COMMON_HEADERS,
  slugify,
  isPrerenderInterrupted,
} from "@/lib/api-serializers";
import { getAuthenticatedAdmin, AuthHttpError } from "@/lib/server-admin-auth";

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate Admin
    await getAuthenticatedAdmin(request);

    // 2. Parse Query Parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const search = searchParams.get("search")?.trim() || null;
    const industry = searchParams.get("industry")?.trim() || null;
    const isVerifiedParam = searchParams.get("is_verified");
    const isVerified =
      isVerifiedParam === "true"
        ? true
        : isVerifiedParam === "false"
        ? false
        : undefined;

    // 3. Build Prisma Filter
    const where: Prisma.CompanyWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (industry) {
      where.industry = { contains: industry, mode: "insensitive" };
    }

    if (isVerified !== undefined) {
      where.isVerified = isVerified;
    }

    // 4. Query Total and Items
    const [total, items] = await Promise.all([
      prisma.company.count({ where }),
      prisma.company.findMany({
        where,
        include: {
          offices: {
            orderBy: { id: "asc" },
          },
          jobs: true,
        },
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = total > 0 ? Math.ceil(total / limit) : 1;

    // 5. Serialize Items with primary office location data
    const serializedItems = items.map((c) =>
      serializeCompany(c, c.offices[0] || null)
    );

    return NextResponse.json(
      {
        items: serializedItems,
        total,
        page,
        limit,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
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
    console.error("Admin list companies error:", err);
    return NextResponse.json(
      { detail: "Internal server error fetching companies." },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate Admin & Enforce CSRF
    await getAuthenticatedAdmin(request);

    // 2. Parse Request Body
    const body = await request.json().catch(() => null);
    if (!body || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { detail: "Company name is required and must be a valid string." },
        { status: 422, headers: COMMON_HEADERS }
      );
    }

    const name = body.name.trim();
    const rawSlug = typeof body.slug === "string" && body.slug.trim() ? body.slug : name;
    const slug = slugify(rawSlug);

    if (!slug) {
      return NextResponse.json(
        { detail: "Invalid company slug or name cannot generate a valid slug." },
        { status: 422, headers: COMMON_HEADERS }
      );
    }

    // 3. Unique Slug Check
    const existing = await prisma.company.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { detail: `Company with slug '${slug}' already exists.` },
        { status: 400, headers: COMMON_HEADERS }
      );
    }

    // 4. Validate and Parse Optional Fields
    const cin = typeof body.cin === "string" && body.cin.trim() ? body.cin.trim() : null;
    const description = typeof body.description === "string" ? body.description.trim() : null;
    const website = typeof body.website === "string" && body.website.trim() ? body.website.trim() : null;
    const email = typeof body.email === "string" && body.email.trim() ? body.email.trim() : null;
    const phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;
    const logoUrl = typeof body.logo_url === "string" && body.logo_url.trim() ? body.logo_url.trim() : null;
    const industry = typeof body.industry === "string" && body.industry.trim() ? body.industry.trim() : null;
    const companySize = typeof body.company_size === "string" && body.company_size.trim() ? body.company_size.trim() : null;
    const foundedYear =
      typeof body.founded_year === "number" && !isNaN(body.founded_year)
        ? Math.floor(body.founded_year)
        : null;
    const isVerified = typeof body.is_verified === "boolean" ? body.is_verified : true;

    // 5. Create Company
    const company = await prisma.company.create({
      data: {
        name,
        slug,
        cin,
        description,
        website,
        email,
        phone,
        logoUrl,
        industry,
        companySize,
        foundedYear,
        isVerified,
      },
    });

    return NextResponse.json(serializeCompany(company, null), {
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
    console.error("Admin create company error:", err);
    return NextResponse.json(
      { detail: "Internal server error creating company." },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}
