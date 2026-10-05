import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";

function clean(value: unknown) {
  return String(value || "").trim();
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requirePermission(
      PERMISSIONS.CUSTOMER_ASSETS_EDIT,
    );
    const { id: customerId } = await params;
    const body = await req.json();
    const entity = String(body?.entity || "");

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "العميل غير موجود" },
        { status: 404 },
      );
    }

    if (entity === "property") {
      const governorate = clean(body?.governorate);
      const area = clean(body?.area);
      const address = clean(body?.address);

      if (!governorate || !area || !address) {
        return NextResponse.json(
          { error: "المحافظة والمنطقة والعنوان مطلوبة" },
          { status: 400 },
        );
      }

      const property = await prisma.property.create({
        data: {
          customerId,
          label: clean(body?.label) || null,
          governorate,
          area,
          address,
          building: clean(body?.building) || null,
          floor: clean(body?.floor) || null,
          apartment: clean(body?.apartment) || null,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: actor.id,
          actorLabel: actor.name,
          action: "CUSTOMER_PROPERTY_CREATED",
          newValue: {
            customerId,
            propertyId: property.id,
            label: property.label,
            governorate,
            area,
            address,
          },
        },
      });

      return NextResponse.json({ property }, { status: 201 });
    }

    if (entity === "device") {
      const propertyId = clean(body?.propertyId);
      const type = clean(body?.type);

      if (!propertyId || !type) {
        return NextResponse.json(
          { error: "العقار ونوع الجهاز مطلوبان" },
          { status: 400 },
        );
      }

      const property = await prisma.property.findFirst({
        where: {
          id: propertyId,
          customerId,
        },
      });

      if (!property) {
        return NextResponse.json(
          { error: "العقار غير تابع لهذا العميل" },
          { status: 400 },
        );
      }

      const installedAt = body?.installedAt
        ? new Date(String(body.installedAt))
        : null;
      const warrantyEndsAt = body?.warrantyEndsAt
        ? new Date(String(body.warrantyEndsAt))
        : null;

      const device = await prisma.device.create({
        data: {
          propertyId,
          type,
          brand: clean(body?.brand) || null,
          model: clean(body?.model) || null,
          size: clean(body?.size) || null,
          location: clean(body?.location) || null,
          installedAt:
            installedAt && !Number.isNaN(installedAt.getTime())
              ? installedAt
              : null,
          warrantyEndsAt:
            warrantyEndsAt && !Number.isNaN(warrantyEndsAt.getTime())
              ? warrantyEndsAt
              : null,
          notes: clean(body?.notes) || null,
          active: body?.active !== false,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: actor.id,
          actorLabel: actor.name,
          action: "CUSTOMER_DEVICE_CREATED",
          newValue: {
            customerId,
            propertyId,
            deviceId: device.id,
            type: device.type,
          },
        },
      });

      return NextResponse.json({ device }, { status: 201 });
    }

    return NextResponse.json(
      { error: "نوع العملية غير صحيح" },
      { status: 400 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "تعذر حفظ البيانات" },
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requirePermission(
      PERMISSIONS.CUSTOMER_ASSETS_EDIT,
    );
    const { id: customerId } = await params;
    const body = await req.json();
    const entity = String(body?.entity || "");
    const entityId = clean(body?.id);

    if (!entityId) {
      return NextResponse.json(
        { error: "المعرف مطلوب" },
        { status: 400 },
      );
    }

    if (entity === "property") {
      const current = await prisma.property.findFirst({
        where: {
          id: entityId,
          customerId,
        },
      });

      if (!current) {
        return NextResponse.json(
          { error: "العقار غير موجود" },
          { status: 404 },
        );
      }

      const updated = await prisma.property.update({
        where: { id: current.id },
        data: {
          label:
            body?.label === undefined
              ? current.label
              : clean(body.label) || null,
          governorate:
            body?.governorate === undefined
              ? current.governorate
              : clean(body.governorate),
          area:
            body?.area === undefined
              ? current.area
              : clean(body.area),
          address:
            body?.address === undefined
              ? current.address
              : clean(body.address),
          building:
            body?.building === undefined
              ? current.building
              : clean(body.building) || null,
          floor:
            body?.floor === undefined
              ? current.floor
              : clean(body.floor) || null,
          apartment:
            body?.apartment === undefined
              ? current.apartment
              : clean(body.apartment) || null,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: actor.id,
          actorLabel: actor.name,
          action: "CUSTOMER_PROPERTY_UPDATED",
          oldValue: {
            propertyId: current.id,
            label: current.label,
            governorate: current.governorate,
            area: current.area,
            address: current.address,
          },
          newValue: {
            propertyId: updated.id,
            label: updated.label,
            governorate: updated.governorate,
            area: updated.area,
            address: updated.address,
          },
        },
      });

      return NextResponse.json({ property: updated });
    }

    if (entity === "device") {
      const current = await prisma.device.findFirst({
        where: {
          id: entityId,
          property: {
            customerId,
          },
        },
      });

      if (!current) {
        return NextResponse.json(
          { error: "الجهاز غير موجود" },
          { status: 404 },
        );
      }

      const updated = await prisma.device.update({
        where: { id: current.id },
        data: {
          type:
            body?.type === undefined
              ? current.type
              : clean(body.type),
          brand:
            body?.brand === undefined
              ? current.brand
              : clean(body.brand) || null,
          model:
            body?.model === undefined
              ? current.model
              : clean(body.model) || null,
          size:
            body?.size === undefined
              ? current.size
              : clean(body.size) || null,
          location:
            body?.location === undefined
              ? current.location
              : clean(body.location) || null,
          notes:
            body?.notes === undefined
              ? current.notes
              : clean(body.notes) || null,
          active:
            body?.active === undefined
              ? current.active
              : Boolean(body.active),
        },
      });

      await prisma.auditLog.create({
        data: {
          orderId: current.sourceOrderId,
          actorId: actor.id,
          actorLabel: actor.name,
          action: "CUSTOMER_DEVICE_UPDATED",
          oldValue: {
            deviceId: current.id,
            type: current.type,
            brand: current.brand,
            model: current.model,
            active: current.active,
          },
          newValue: {
            deviceId: updated.id,
            type: updated.type,
            brand: updated.brand,
            model: updated.model,
            active: updated.active,
          },
        },
      });

      return NextResponse.json({ device: updated });
    }

    return NextResponse.json(
      { error: "نوع العملية غير صحيح" },
      { status: 400 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "تعذر تحديث البيانات" },
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
