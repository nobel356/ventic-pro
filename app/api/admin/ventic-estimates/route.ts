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
    id: estimate.id,
    orderId: estimate.orderId,
    version: estimate.version,
    status: estimate.status,
    subtotal: Number(estimate.subtotal),
    discount: Number(estimate.discount),
    total: Number(estimate.total),
    notes: estimate.notes,
    sentAt: estimate.sentAt,
    respondedAt: estimate.respondedAt,
    createdAt: estimate.createdAt,
    updatedAt: estimate.updatedAt,
    approvalPath: `/customer/approval/${estimate.customerToken}`,
    items: (estimate.items || []).map((item: any) => {
      const qty = Number(item.qty);
      const unitPrice = Number(item.unitPrice);
      return {
        id: item.id,
        description: item.description,
        unit: item.unit,
        qty,
        unitPrice,
        lineTotal: roundMoney(qty * unitPrice),
        sortOrder: item.sortOrder,
      };
    }),
  };
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

  if (message === "UNAUTHENTICATED") {
    return NextResponse.json({ error: message }, { status: 401 });
  }
  if (message === "FORBIDDEN") {
    return NextResponse.json({ error: message }, { status: 403 });
  }
  if (message.startsWith("VALIDATION:")) {
    return NextResponse.json(
      { error: message.slice("VALIDATION:".length) },
      { status: 400 },
    );
  }

  console.error("Ventic estimate error:", error);
  return NextResponse.json(
    { error: "حدث خطأ غير متوقع. حاول مرة أخرى." },
    { status: 500 },
  );
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
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: {
        version: "desc",
      },
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
        throw new Error("VALIDATION:الطلب غير محدد");
      }

      const existingDraft = await prisma.venticEstimate.findFirst({
        where: {
          orderId,
          status: "DRAFT",
        },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
        },
        orderBy: { version: "desc" },
      });

      if (existingDraft) {
        return NextResponse.json(
          {
            error: "يوجد بالفعل إصدار مسودة لهذا الطلب.",
            estimate: serializeEstimate(existingDraft),
          },
          { status: 409 },
        );
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
          };
        }),
      );

      if (sourceItems.length === 0) {
        throw new Error("VALIDATION:لا توجد بنود في مقايسة العميل لنسخها");
      }

      const latest = await prisma.venticEstimate.aggregate({
        where: { orderId },
        _max: { version: true },
      });

      const version = (latest._max.version || 0) + 1;
      const subtotal = roundMoney(
        sourceItems.reduce(
          (sum, item) => sum + item.qty * item.unitPrice,
          0,
        ),
      );
      const customerToken = crypto.randomBytes(24).toString("hex");

      const created = await prisma.$transaction(async (tx) => {
        const estimate = await tx.venticEstimate.create({
          data: {
            orderId,
            version,
            status: "DRAFT",
            subtotal,
            discount: 0,
            total: subtotal,
            customerToken,
            items: {
              create: sourceItems.map((item, index) => ({
                ...item,
                sortOrder: index,
              })),
            },
          },
          include: {
            items: { orderBy: { sortOrder: "asc" } },
          },
        });

        await tx.auditLog.create({
          data: {
            orderId,
            actorId: user.id,
            actorLabel: user.name,
            action: "VENTIC_ESTIMATE_CREATED",
            newValue: {
              estimateId: estimate.id,
              version,
              total: subtotal,
            },
          },
        });

        return estimate;
      });

      return NextResponse.json(serializeEstimate(created), { status: 201 });
    }

    if (action === "save") {
      const user = await requirePermission(PERMISSIONS.PRICE_EDIT);
      const estimateId = String(body.estimateId || "");

      if (!estimateId) {
        throw new Error("VALIDATION:المقايسة غير محددة");
      }

      const existing = await prisma.venticEstimate.findUnique({
        where: { id: estimateId },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "المقايسة غير موجودة" },
          { status: 404 },
        );
      }

      if (existing.status !== "DRAFT") {
        return NextResponse.json(
          {
            error:
              "لا يمكن تعديل مقايسة تم إرسالها. أنشئ إصدارًا جديدًا للتعديل.",
          },
          { status: 409 },
        );
      }

      const rawItems = Array.isArray(body.items) ? body.items : [];

      if (rawItems.length === 0) {
        throw new Error(
          "VALIDATION:يجب أن تحتوي المقايسة على بند واحد على الأقل",
        );
      }

      const items = rawItems.map((item: any, index: number) => {
        const description = String(item.description || "").trim();
        const unit = String(item.unit || "وحدة").trim() || "وحدة";
        const qty = Number(item.qty);
        const unitPrice = Number(item.unitPrice);

        if (!description) {
          throw new Error(
            `VALIDATION:اكتب وصف البند رقم ${index + 1}`,
          );
        }
        if (!Number.isFinite(qty) || qty <= 0) {
          throw new Error(
            `VALIDATION:كمية البند رقم ${index + 1} غير صحيحة`,
          );
        }
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          throw new Error(
            `VALIDATION:سعر البند رقم ${index + 1} غير صحيح`,
          );
        }

        return {
          description,
          unit,
          qty,
          unitPrice,
          sortOrder: index,
        };
      });

      const subtotal = roundMoney(
        items.reduce(
          (sum: number, item: { qty: number; unitPrice: number }) =>
            sum + item.qty * item.unitPrice,
          0,
        ),
      );

      const discount = roundMoney(Number(body.discount || 0));

      if (
        !Number.isFinite(discount) ||
        discount < 0 ||
        discount > subtotal
      ) {
        throw new Error("VALIDATION:قيمة الخصم غير صحيحة");
      }

      const total = roundMoney(subtotal - discount);
      const notes = String(body.notes || "").trim() || null;

      const updated = await prisma.$transaction(async (tx) => {
        const estimate = await tx.venticEstimate.update({
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
          include: {
            items: { orderBy: { sortOrder: "asc" } },
          },
        });

        await tx.auditLog.create({
          data: {
            orderId: existing.orderId,
            actorId: user.id,
            actorLabel: user.name,
            action: "VENTIC_ESTIMATE_SAVED",
            oldValue: {
              total: Number(existing.total),
            },
            newValue: {
              total,
              discount,
              itemCount: items.length,
            },
          },
        });

        return estimate;
      });

      return NextResponse.json(serializeEstimate(updated));
    }

    if (action === "send") {
      const user = await requirePermission(PERMISSIONS.QUOTE_SEND);
      const estimateId = String(body.estimateId || "");

      if (!estimateId) {
        throw new Error("VALIDATION:المقايسة غير محددة");
      }

      const existing = await prisma.venticEstimate.findUnique({
        where: { id: estimateId },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
        },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "المقايسة غير موجودة" },
          { status: 404 },
        );
      }

      if (existing.status !== "DRAFT") {
        return NextResponse.json(
          { error: "هذه المقايسة تم إرسالها بالفعل" },
          { status: 409 },
        );
      }

      if (existing.items.length === 0) {
        throw new Error("VALIDATION:لا يمكن إرسال مقايسة بدون بنود");
      }

      const subtotal = roundMoney(
        existing.items.reduce(
          (sum, item) =>
            sum + Number(item.qty) * Number(item.unitPrice),
          0,
        ),
      );
      const discount = Number(existing.discount);

      if (discount < 0 || discount > subtotal) {
        throw new Error("VALIDATION:قيمة الخصم غير صحيحة");
      }

      const total = roundMoney(subtotal - discount);

      const updated = await prisma.$transaction(async (tx) => {
        const estimate = await tx.venticEstimate.update({
          where: { id: estimateId },
          data: {
            subtotal,
            total,
            status: "SENT",
            sentAt: new Date(),
          },
          include: {
            items: { orderBy: { sortOrder: "asc" } },
          },
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
              total,
            },
          },
        });

        return estimate;
      });

      return NextResponse.json({
        estimate: serializeEstimate(updated),
        approvalPath: `/customer/approval/${updated.customerToken}`,
      });
    }

    if (action === "newVersion") {
      const user = await requirePermission(PERMISSIONS.PRICE_EDIT);
      const estimateId = String(body.estimateId || "");

      if (!estimateId) {
        throw new Error("VALIDATION:المقايسة غير محددة");
      }

      const source = await prisma.venticEstimate.findUnique({
        where: { id: estimateId },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
        },
      });

      if (!source) {
        return NextResponse.json(
          { error: "المقايسة غير موجودة" },
          { status: 404 },
        );
      }

      if (source.status === "DRAFT") {
        return NextResponse.json(
          {
            error:
              "المقايسة الحالية ما زالت مسودة ويمكن تعديلها مباشرة.",
          },
          { status: 409 },
        );
      }

      const draftExists = await prisma.venticEstimate.findFirst({
        where: {
          orderId: source.orderId,
          status: "DRAFT",
        },
      });

      if (draftExists) {
        return NextResponse.json(
          { error: "يوجد إصدار مسودة بالفعل لهذا الطلب." },
          { status: 409 },
        );
      }

      const latest = await prisma.venticEstimate.aggregate({
        where: { orderId: source.orderId },
        _max: { version: true },
      });
      const version = (latest._max.version || 0) + 1;
      const customerToken = crypto.randomBytes(24).toString("hex");

      const created = await prisma.$transaction(async (tx) => {
        const estimate = await tx.venticEstimate.create({
          data: {
            orderId: source.orderId,
            version,
            status: "DRAFT",
            subtotal: source.subtotal,
            discount: source.discount,
            total: source.total,
            notes: source.notes,
            customerToken,
            items: {
              create: source.items.map((item, index) => ({
                description: item.description,
                unit: item.unit,
                qty: item.qty,
                unitPrice: item.unitPrice,
                sortOrder: index,
              })),
            },
          },
          include: {
            items: { orderBy: { sortOrder: "asc" } },
          },
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
              estimateId: estimate.id,
            },
          },
        });

        return estimate;
      });

      return NextResponse.json(serializeEstimate(created), { status: 201 });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}
