import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/auth-v7";

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function inferUnit(code: string, name: string) {
  const text = `${code} ${name}`.toLowerCase();
  return /duct|دكت|متر|خط طرد/.test(text) ? "متر" : "وحدة";
}

function serializeEstimate(estimate: any) {
  return {
    ...estimate,
    subtotal: Number(estimate.subtotal),
    discount: Number(estimate.discount),
    total: Number(estimate.total),
    items: (estimate.items || []).map((item: any) => ({
      ...item,
      qty: Number(item.qty),
      unitPrice: Number(item.unitPrice),
      total: Number(item.total),
    })),
  };
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
  const status =
    message === "UNAUTHENTICATED"
      ? 401
      : message === "FORBIDDEN"
        ? 403
        : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  try {
    await requirePermission(PERMISSIONS.ORDERS_VIEW);
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ error: "orderId مطلوب" }, { status: 400 });
    }

    const estimates = await prisma.venticEstimate.findMany({
      where: { orderId },
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { version: "desc" },
    });

    return NextResponse.json(estimates.map(serializeEstimate));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = String(body.action || "");

    if (action === "create") {
      const user = await requirePermission(PERMISSIONS.PRICE_EDIT);
      const orderId = String(body.orderId || "");

      if (!orderId) {
        return NextResponse.json({ error: "الطلب غير محدد" }, { status: 400 });
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          spaces: {
            include: {
              services: true,
            },
          },
        },
      });

      if (!order) {
        return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
      }

      const sourceItems = order.spaces.flatMap((space) =>
        space.services.map((service) => {
          const qty = Number(service.qty);
          const unitPrice = Number(service.unitPriceSnapshot);
          return {
            description: `${space.label} - ${service.serviceNameSnapshot}`,
            unit: inferUnit(
              service.serviceCodeSnapshot,
              service.serviceNameSnapshot,
            ),
            qty,
            unitPrice,
            total: roundMoney(qty * unitPrice),
          };
        }),
      );

      if (sourceItems.length === 0) {
        return NextResponse.json(
          { error: "لا توجد بنود في مقايسة العميل لنسخها" },
          { status: 400 },
        );
      }

      const latest = await prisma.venticEstimate.aggregate({
        where: { orderId },
        _max: { version: true },
      });
      const version = (latest._max.version || 0) + 1;
      const subtotal = roundMoney(
        sourceItems.reduce((sum, item) => sum + item.total, 0),
      );
      const token = crypto.randomBytes(24).toString("hex");

      const estimate = await prisma.$transaction(async (tx) => {
        const created = await tx.venticEstimate.create({
          data: {
            orderId,
            version,
            status: "DRAFT",
            subtotal,
            discount: 0,
            total: subtotal,
            customerToken: token,
            items: {
              create: sourceItems.map((item, index) => ({
                ...item,
                sortOrder: index,
              })),
            },
          },
          include: { items: { orderBy: { sortOrder: "asc" } } },
        });

        await tx.auditLog.create({
          data: {
            orderId,
            actorId: user.id,
            actorLabel: user.name,
            action: "VENTIC_ESTIMATE_CREATED",
            newValue: {
              estimateId: created.id,
              version,
              total: subtotal,
            },
          },
        });

        return created;
      });

      return NextResponse.json(serializeEstimate(estimate), { status: 201 });
    }

    if (action === "save") {
      const user = await requirePermission(PERMISSIONS.PRICE_EDIT);
      const estimateId = String(body.estimateId || "");
      const rawItems = Array.isArray(body.items) ? body.items : [];

      const existing = await prisma.venticEstimate.findUnique({
        where: { id: estimateId },
        include: { items: true },
      });

      if (!existing) {
        return NextResponse.json({ error: "المقايسة غير موجودة" }, { status: 404 });
      }

      if (existing.status !== "DRAFT") {
        return NextResponse.json(
          { error: "لا يمكن تعديل مقايسة تم إرسالها. أنشئ إصدارًا جديدًا." },
          { status: 409 },
        );
      }

      if (rawItems.length === 0) {
        return NextResponse.json(
          { error: "يجب أن تحتوي المقايسة على بند واحد على الأقل" },
          { status: 400 },
        );
      }

      const items = rawItems.map((item: any, index: number) => {
        const description = String(item.description || "").trim();
        const unit = String(item.unit || "وحدة").trim() || "وحدة";
        const qty = Number(item.qty);
        const unitPrice = Number(item.unitPrice);

        if (!description || !Number.isFinite(qty) || qty <= 0) {
          throw new Error(`INVALID_ITEM_${index + 1}`);
        }
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          throw new Error(`INVALID_PRICE_${index + 1}`);
        }

        return {
          description,
          unit,
          qty,
          unitPrice,
          total: roundMoney(qty * unitPrice),
          sortOrder: index,
        };
      });

      const subtotal = roundMoney(
        items.reduce((sum: number, item: { total: number }) => sum + item.total, 0),
      );
      const discount = roundMoney(Number(body.discount || 0));

      if (!Number.isFinite(discount) || discount < 0 || discount > subtotal) {
        return NextResponse.json(
          { error: "قيمة الخصم غير صحيحة" },
          { status: 400 },
        );
      }

      const total = roundMoney(subtotal - discount);
      const notes = String(body.notes || "").trim() || null;

      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.venticEstimate.update({
          where: { id: estimateId },
          data: {
            subtotal,
            discount,
            total,
            notes,
            items: {
              deleteMany: {},
              create: items,
            },
          },
          include: { items: { orderBy: { sortOrder: "asc" } } },
        });

        await tx.auditLog.create({
          data: {
            orderId: existing.orderId,
            actorId: user.id,
            actorLabel: user.name,
            action: "VENTIC_ESTIMATE_SAVED",
            oldValue: { total: Number(existing.total) },
            newValue: { total, discount, itemCount: items.length },
          },
        });

        return result;
      });

      return NextResponse.json(serializeEstimate(updated));
    }

    if (action === "send") {
      const user = await requirePermission(PERMISSIONS.QUOTE_SEND);
      const estimateId = String(body.estimateId || "");

      const existing = await prisma.venticEstimate.findUnique({
        where: { id: estimateId },
        include: { items: true },
      });

      if (!existing) {
        return NextResponse.json({ error: "المقايسة غير موجودة" }, { status: 404 });
      }

      if (existing.status !== "DRAFT") {
        return NextResponse.json(
          { error: "هذه المقايسة تم إرسالها بالفعل" },
          { status: 409 },
        );
      }

      if (existing.items.length === 0) {
        return NextResponse.json(
          { error: "لا يمكن إرسال مقايسة بدون بنود" },
          { status: 400 },
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.venticEstimate.update({
          where: { id: estimateId },
          data: {
            status: "SENT",
            sentAt: new Date(),
          },
          include: { items: { orderBy: { sortOrder: "asc" } } },
        });

        await tx.auditLog.create({
          data: {
            orderId: existing.orderId,
            actorId: user.id,
            actorLabel: user.name,
            action: "VENTIC_ESTIMATE_SENT",
            newValue: {
              estimateId,
              version: existing.version,
              total: Number(existing.total),
            },
          },
        });

        return result;
      });

      return NextResponse.json({
        estimate: serializeEstimate(updated),
        approvalPath: `/customer/approval/${updated.customerToken}`,
      });
    }

    if (action === "newVersion") {
      const user = await requirePermission(PERMISSIONS.PRICE_EDIT);
      const estimateId = String(body.estimateId || "");

      const source = await prisma.venticEstimate.findUnique({
        where: { id: estimateId },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      });

      if (!source) {
        return NextResponse.json({ error: "المقايسة غير موجودة" }, { status: 404 });
      }

      if (source.status === "DRAFT") {
        return NextResponse.json(
          { error: "المقايسة الحالية ما زالت مسودة ويمكن تعديلها مباشرة" },
          { status: 409 },
        );
      }

      const latest = await prisma.venticEstimate.aggregate({
        where: { orderId: source.orderId },
        _max: { version: true },
      });
      const version = (latest._max.version || 0) + 1;
      const token = crypto.randomBytes(24).toString("hex");

      const created = await prisma.$transaction(async (tx) => {
        const result = await tx.venticEstimate.create({
          data: {
            orderId: source.orderId,
            version,
            status: "DRAFT",
            subtotal: source.subtotal,
            discount: source.discount,
            total: source.total,
            notes: source.notes,
            customerToken: token,
            items: {
              create: source.items.map((item, index) => ({
                description: item.description,
                unit: item.unit,
                qty: item.qty,
                unitPrice: item.unitPrice,
                total: item.total,
                sortOrder: index,
              })),
            },
          },
          include: { items: { orderBy: { sortOrder: "asc" } } },
        });

        await tx.auditLog.create({
          data: {
            orderId: source.orderId,
            actorId: user.id,
            actorLabel: user.name,
            action: "VENTIC_ESTIMATE_NEW_VERSION",
            newValue: {
              fromVersion: source.version,
              toVersion: version,
              estimateId: result.id,
            },
          },
        });

        return result;
      });

      return NextResponse.json(serializeEstimate(created), { status: 201 });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    if (message.startsWith("INVALID_ITEM_")) {
      return NextResponse.json(
        { error: "راجع وصف وكمية بنود المقايسة" },
        { status: 400 },
      );
    }

    if (message.startsWith("INVALID_PRICE_")) {
      return NextResponse.json(
        { error: "راجع سعر الوحدة في بنود المقايسة" },
        { status: 400 },
      );
    }

    return errorResponse(error);
  }
}
