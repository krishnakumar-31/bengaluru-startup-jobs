import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  serializeOffice,
  COMMON_HEADERS,
  validateBengaluruCoordinates,
  validateBengaluruPostalCode,
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

    // 2. Parse Office ID
    const { id } = await params;
    const officeId = parseInt(id, 10);
    if (isNaN(officeId)) {
      return NextResponse.json(
        { detail: "Invalid office ID. Must be an integer." },
        { status: 422, headers: COMMON_HEADERS }
      );
    }

    // 3. Query Office
    const office = await prisma.office.findUnique({
      where: { id: officeId },
      include: {
        company: true,
        jobs: true,
      },
    });

    if (!office) {
      return NextResponse.json(
        { detail: `Office with ID ${officeId} not found.` },
        { status: 404, headers: COMMON_HEADERS }
      );
    }

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
    console.error("Admin get office error:", err);
    return NextResponse.json(
      { detail: "Internal server error fetching office." },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate Admin & Validate CSRF
    await getAuthenticatedAdmin(request);

    // 2. Parse Office ID
    const { id } = await params;
    const officeId = parseInt(id, 10);
    if (isNaN(officeId)) {
      return NextResponse.json(
        { detail: "Invalid office ID. Must be an integer." },
        { status: 422, headers: COMMON_HEADERS }
      );
    }

    // 3. Verify Existing Office
    const existingOffice = await prisma.office.findUnique({
      where: { id: officeId },
    });

    if (!existingOffice) {
      return NextResponse.json(
        { detail: `Office with ID ${officeId} not found.` },
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

    const updateData: Prisma.OfficeUpdateInput = {};

    // Validate company_id if provided
    if (body.company_id !== undefined) {
      const companyId = parseInt(body.company_id, 10);
      if (isNaN(companyId)) {
        return NextResponse.json(
          { detail: "Valid company_id is required." },
          { status: 422, headers: COMMON_HEADERS }
        );
      }
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });
      if (!company) {
        return NextResponse.json(
          { detail: `Company ID ${companyId} not found.` },
          { status: 400, headers: COMMON_HEADERS }
        );
      }
      updateData.company = { connect: { id: companyId } };
    }

    // Validate Coordinates
    if (body.latitude !== undefined || body.longitude !== undefined) {
      const lat = body.latitude !== undefined ? body.latitude : existingOffice.latitude;
      const lng = body.longitude !== undefined ? body.longitude : existingOffice.longitude;

      if (lat !== null && lng !== null) {
        const geoCheck = validateBengaluruCoordinates(lat, lng);
        if (!geoCheck.valid) {
          return NextResponse.json(
            { detail: `Invalid coordinates: ${geoCheck.error}` },
            { status: 400, headers: COMMON_HEADERS }
          );
        }
        updateData.latitude = lat;
        updateData.longitude = lng;
      } else if (lat === null && lng === null) {
        updateData.latitude = null;
        updateData.longitude = null;
      } else {
        return NextResponse.json(
          { detail: "Both latitude and longitude must be provided." },
          { status: 400, headers: COMMON_HEADERS }
        );
      }
    }

    // Validate Postal Code
    if (body.postal_code !== undefined) {
      if (typeof body.postal_code === "string" && body.postal_code.trim()) {
        const pinCheck = validateBengaluruPostalCode(body.postal_code);
        if (!pinCheck.valid) {
          return NextResponse.json(
            { detail: `Invalid Bengaluru postal code: ${pinCheck.error}` },
            { status: 400, headers: COMMON_HEADERS }
          );
        }
        updateData.postalCode = body.postal_code.trim();
      } else {
        updateData.postalCode = null;
      }
    }

    if (body.locality !== undefined) {
      if (typeof body.locality !== "string" || !body.locality.trim()) {
        return NextResponse.json(
          { detail: "Locality cannot be blank." },
          { status: 422, headers: COMMON_HEADERS }
        );
      }
      updateData.locality = body.locality.trim();
    }

    if (body.name !== undefined) {
      updateData.name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : null;
    }
    if (body.address !== undefined) {
      updateData.address = typeof body.address === "string" ? body.address.trim() : null;
    }
    if (body.city !== undefined) {
      updateData.city = typeof body.city === "string" && body.city.trim() ? body.city.trim() : "Bengaluru";
    }
    if (body.state !== undefined) {
      updateData.state = typeof body.state === "string" && body.state.trim() ? body.state.trim() : "Karnataka";
    }
    if (body.is_headquarters !== undefined) {
      updateData.isHeadquarters = Boolean(body.is_headquarters);
    }

    // 5. Update Database Record
    const updated = await prisma.office.update({
      where: { id: officeId },
      data: updateData,
    });

    return NextResponse.json(serializeOffice(updated), {
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
    console.error("Admin update office error:", err);
    return NextResponse.json(
      { detail: "Internal server error updating office." },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate Admin & Validate CSRF
    await getAuthenticatedAdmin(request);

    // 2. Parse Office ID
    const { id } = await params;
    const officeId = parseInt(id, 10);
    if (isNaN(officeId)) {
      return NextResponse.json(
        { detail: "Invalid office ID. Must be an integer." },
        { status: 422, headers: COMMON_HEADERS }
      );
    }

    // 3. Verify Existing Office
    const office = await prisma.office.findUnique({
      where: { id: officeId },
    });

    if (!office) {
      return NextResponse.json(
        { detail: `Office with ID ${officeId} not found.` },
        { status: 404, headers: COMMON_HEADERS }
      );
    }

    // 4. Delete Protection Check
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    const jobsCount = await prisma.job.count({
      where: { officeId },
    });

    if (jobsCount > 0 && !force) {
      return NextResponse.json(
        {
          detail: `Protected record: Office has ${jobsCount} job(s) assigned to it. Please reassign jobs first or specify force delete.`,
        },
        { status: 400, headers: COMMON_HEADERS }
      );
    }

    // 5. Execute Safe Deletion (Nullify job references if force=true)
    await prisma.$transaction(async (tx) => {
      if (jobsCount > 0) {
        await tx.job.updateMany({
          where: { officeId },
          data: { officeId: null },
        });
      }
      await tx.office.delete({
        where: { id: officeId },
      });
    });

    return NextResponse.json(
      { message: `Office ID ${officeId} deleted successfully.` },
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
    console.error("Admin delete office error:", err);
    return NextResponse.json(
      { detail: "Internal server error deleting office." },
      { status: 500, headers: COMMON_HEADERS }
    );
  }
}
