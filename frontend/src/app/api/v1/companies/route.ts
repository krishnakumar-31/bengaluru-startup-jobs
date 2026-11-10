import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  serializeCompany,
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
    const name = searchParams.get("name")?.trim() || null;
    const industry = searchParams.get("industry")?.trim() || null;
    const locality = searchParams.get("locality")?.trim() || null;
    const rawVerified = searchParams.get("is_verified");
    const isVerified =
      rawVerified !== null
        ? rawVerified === "true" || rawVerified === "1"
        : null;

    const where: Prisma.CompanyWhereInput = {
      ...(isVerified !== null ? { isVerified } : {}),
      ...(name ? { name: { contains: name, mode: "insensitive" } } : {}),
      ...(industry
        ? { industry: { contains: industry, mode: "insensitive" } }
        : {}),
      ...(locality
        ? {
            offices: {
              some: {
                locality: { contains: locality, mode: "insensitive" },
              },
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { industry: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.company.count({ where }),
      prisma.company.findMany({
        where,
        include: {
          offices: {
            orderBy: { id: "asc" },
          },
        },
        orderBy: { name: "asc" },
        skip: actualSkip,
        take: limit,
      }),
    ]);

    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    return NextResponse.json(
      {
        items: items.map((c) => serializeCompany(c, c.offices[0] || null)),
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
    console.error("Error in GET /api/v1/companies:", error);
    return NextResponse.json(
      { detail: "Internal server error fetching companies" },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}
