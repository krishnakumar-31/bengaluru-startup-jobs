import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  serializeOffice,
  serializeAdminOffice,
  COMMON_HEADERS,
  validateBengaluruCoordinates,
  validateBengaluruPostalCode,
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
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50));
    const companyIdParam = searchParams.get("company_id");
    const companyId = companyIdParam ? parseInt(companyIdParam, 10) : undefined;
    const locality = searchParams.get("locality")?.trim() || null;

    // 3. Build Prisma Filter
    const where: Prisma.OfficeWhereInput = {};

    if (companyId && !isNaN(companyId)) {
      where.companyId = companyId;
    }

    if (locality) {
      where.locality = { contains: locality, mode: "insensitive" };
    }

    // 4. Query Total and Items
    const [total, items] = await Promise.all([
      prisma.office.count({ where }),
      prisma.office.findMany({
        where,
        include: {
          company: {
            select: { name: true },
          },
        },
        orderBy: { locality: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json(
      {
        items: items.map(serializeAdminOffice),
        total,
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
    console.error("Admin list offices error:", err);
    return NextResponse.json(
      { detail: "Internal server error fetching offices." },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate Admin & Validate CSRF
    await getAuthenticatedAdmin(request);

    // 2. Parse Request Body
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { detail: "Invalid request payload." },
        { status: 422, headers: COMMON_HEADERS }
      );
    }

    const {
      company_id,
      name,
      address,
      locality,
      city,
      state,
      postal_code,
      latitude,
      longitude,
      is_headquarters,
    } = body;

    // 3. Validate company_id
    if (!company_id || typeof company_id !== "number" || isNaN(company_id)) {
      return NextResponse.json(
        { detail: "Valid company_id is required." },
        { status: 422, headers: COMMON_HEADERS }
      );
    }

    // 4. Validate locality
    if (!locality || typeof locality !== "string" || !locality.trim()) {
      return NextResponse.json(
        { detail: "Locality is required and cannot be blank." },
        { status: 422, headers: COMMON_HEADERS }
      );
    }

    // 5. Verify company exists in database
    const company = await prisma.company.findUnique({
      where: { id: company_id },
    });

    if (!company) {
      return NextResponse.json(
        { detail: `Company with ID ${company_id} does not exist.` },
        { status: 400, headers: COMMON_HEADERS }
      );
    }

    // 6. Validate Coordinates if provided
    const lat = typeof latitude === "number" ? latitude : null;
    const lng = typeof longitude === "number" ? longitude : null;

    if (lat !== null || lng !== null) {
      if (lat === null || lng === null) {
        return NextResponse.json(
          { detail: "Both latitude and longitude must be provided." },
          { status: 400, headers: COMMON_HEADERS }
        );
      }
      const geoCheck = validateBengaluruCoordinates(lat, lng);
      if (!geoCheck.valid) {
        return NextResponse.json(
          { detail: `Coordinates outside Greater Bengaluru bounds: ${geoCheck.error}` },
          { status: 400, headers: COMMON_HEADERS }
        );
      }
    }

    // 7. Validate Postal Code if provided
    if (postal_code) {
      const pinCheck = validateBengaluruPostalCode(String(postal_code));
      if (!pinCheck.valid) {
        return NextResponse.json(
          { detail: `Invalid Bengaluru postal code: ${pinCheck.error}` },
          { status: 400, headers: COMMON_HEADERS }
        );
      }
    }

    // 8. Create Office in Database
    const office = await prisma.office.create({
      data: {
        companyId: company_id,
        name: typeof name === "string" && name.trim() ? name.trim() : null,
        address: typeof address === "string" ? address.trim() : null,
        locality: locality.trim(),
        city: typeof city === "string" && city.trim() ? city.trim() : "Bengaluru",
        state: typeof state === "string" && state.trim() ? state.trim() : "Karnataka",
        postalCode: typeof postal_code === "string" && postal_code.trim() ? postal_code.trim() : null,
        latitude: lat,
        longitude: lng,
        isHeadquarters: Boolean(is_headquarters),
      },
    });

    return NextResponse.json(serializeOffice(office), {
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
    console.error("Admin create office error:", err);
    return NextResponse.json(
      { detail: "Internal server error creating office." },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}
