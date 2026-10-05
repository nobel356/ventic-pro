import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";

function clean(value: unknown) {
  return String(value || "").trim();
}

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.AREAS_MANAGE);

    const [areas, technicians] = await Promise.all([
      prisma.serviceArea.findMany({
        include: {
          technicians: {
            select: {
              id: true,
              name: true,
              active: true,
            },
            orderBy: { name: "asc" },
          },
        },
        orderBy: [
          { governorate: "asc" },
          { area: "asc" },
        ],
      }),
      prisma.user.findMany({
        where: {
          role: "TECHNICIAN",
          active: true,
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({
      areas: areas.map((item) => ({
        id: item.id,
        governorate: item.governorate,
        area: item.area,
        travelFee: Number(item.travelFee),
        serviceDays: item.serviceDays || "",
        active: item.active,
        technicianIds: item.technicians.map((tech) => tech.id),
        technicianNames: item.technicians.map((tech) => tech.name),
      })),
      technicians,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "تعذر تحميل المناطق" },
      {
        status:
          error?.message === "UNAUTHENTICATED"
            ? 401
            : error?.message === "FORBIDDEN"
              ? 403
              : 500,
      },
    );
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requirePermission(
      PERMISSIONS.AREAS_MANAGE,
    );
    const body = await req.json();
    const id = clean(body?.id);
    const governorate = clean(body?.governorate);
    const area = clean(body?.area);
    const serviceDays = clean(body?.serviceDays) || null;
    const travelFee = Math.max(0, Number(body?.travelFee || 0));
    const active = body?.active !== false;
    const technicianIds: string[] = Array.isArray(body?.technicianIds)
      ? Array.from(
          new Set(
            body.technicianIds
              .map((value: unknown) => clean(value))
              .filter((value: string) => Boolean(value)),
          ),
        )
      : [];

    if (!governorate || !area) {
      return NextResponse.json(
        { error: "المحافظة والمنطقة مطلوبتان" },
        { status: 400 },
      );
    }

    const technicianCount = technicianIds.length
      ? await prisma.user.count({
          where: {
            id: { in: technicianIds },
            role: "TECHNICIAN",
            active: true,
          },
        })
      : 0;

    if (technicianCount !== technicianIds.length) {
      return NextResponse.json(
        { error: "يوجد فني غير صالح ضمن الاختيار" },
        { status: 400 },
      );
    }

    const old = id
      ? await prisma.serviceArea.findUnique({
          where: { id },
          include: {
            technicians: {
              select: { id: true, name: true },
            },
          },
        })
      : null;

    const saved = id
      ? await prisma.serviceArea.update({
          where: { id },
          data: {
            governorate,
            area,
            travelFee,
            serviceDays,
            active,
            technicians: {
              set: technicianIds.map((techId) => ({ id: techId })),
            },
          },
          include: {
            technicians: {
              select: { id: true, name: true },
            },
          },
        })
      : await prisma.serviceArea.create({
          data: {
            governorate,
            area,
            travelFee,
            serviceDays,
            active,
            technicians: {
              connect: technicianIds.map((techId) => ({ id: techId })),
            },
          },
          include: {
            technicians: {
              select: { id: true, name: true },
            },
          },
        });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel: actor.name,
        action: id ? "SERVICE_AREA_UPDATED" : "SERVICE_AREA_CREATED",
        oldValue: old
          ? {
              id: old.id,
              governorate: old.governorate,
              area: old.area,
              travelFee: Number(old.travelFee),
              serviceDays: old.serviceDays,
              active: old.active,
              technicians: old.technicians,
            }
          : undefined,
        newValue: {
          id: saved.id,
          governorate: saved.governorate,
          area: saved.area,
          travelFee: Number(saved.travelFee),
          serviceDays: saved.serviceDays,
          active: saved.active,
          technicians: saved.technicians,
        },
      },
    });

    return NextResponse.json({ ok: true, id: saved.id });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "المنطقة مسجلة بالفعل داخل هذه المحافظة" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: error?.message || "تعذر حفظ المنطقة" },
      {
        status:
          error?.message === "UNAUTHENTICATED"
            ? 401
            : error?.message === "FORBIDDEN"
              ? 403
              : 500,
      },
    );
  }
}
