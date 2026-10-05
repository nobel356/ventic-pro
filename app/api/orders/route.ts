import { AdminNotificationType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/admin-notifications";
import { calculateOrderOffer } from "@/lib/promotions";
import {
  clientIp,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/request-security";

const bp: Record<string, number> = {
  new: 350,
  replace: 400,
  install_only: 300,
};

function clean(value: unknown) {
  return String(value || "").trim();
}

export async function POST(req: Request) {
  try {
    const limited = rateLimit(
      `public-order:${clientIp(req)}`,
      {
        limit: 20,
        windowMs: 60 * 60 * 1000,
      },
    );

    if (!limited.allowed) {
      return NextResponse.json(
        {
          error:
            "تم تجاوز عدد الطلبات المسموح به مؤقتًا. حاول مرة أخرى لاحقًا.",
        },
        {
          status: 429,
          headers: rateLimitHeaders(limited),
        },
      );
    }

    const b = await req.json();
    const c = b.customer;

    if (
      !c?.name ||
      !/^01\d{9}$/.test(c.phone || "") ||
      !c.address ||
      !c.date ||
      !c.time
    ) {
      return NextResponse.json(
        { error: "بيانات الطلب غير مكتملة" },
        { status: 400 },
      );
    }

    const configured = await prisma.service.findMany({
      where: { active: true },
    });

    const prices = Object.fromEntries(
      configured.map((service) => [
        service.code,
        Number(service.priceFrom),
      ]),
    );

    const customer = await prisma.customer.upsert({
      where: { phone: c.phone },
      update: { name: c.name },
      create: { name: c.name, phone: c.phone },
    });

    const governorate = clean(c.governorate) || "غير محدد";
    const area = clean(c.area) || "غير محدد";
    const address = clean(c.address);

    let property = await prisma.property.findFirst({
      where: {
        customerId: customer.id,
        governorate,
        area,
        address,
      },
      orderBy: { createdAt: "asc" },
    });

    if (!property) {
      const propertyCount = await prisma.property.count({
        where: { customerId: customer.id },
      });

      property = await prisma.property.create({
        data: {
          customerId: customer.id,
          label:
            clean(c.propertyLabel) ||
            (propertyCount === 0
              ? "العنوان الرئيسي"
              : `عقار ${propertyCount + 1}`),
          governorate,
          area,
          address,
          building: clean(c.building) || null,
          floor: clean(c.floor) || null,
          apartment: clean(c.apartment) || null,
        },
      });
    }

    const spaces: any[] = [];
    const serviceCodes: string[] = [];
    let subtotal = 0;

    (b.baths || []).forEach((x: any, i: number) => {
      const code = `BATH_${String(x.service).toUpperCase()}`;
      const unitPrice =
        prices[code] ??
        bp[x.service] ??
        0;

      serviceCodes.push(code);
      subtotal += unitPrice;

      spaces.push({
        type: "BATHROOM",
        label: `حمام ${i + 1}`,
        details: x,
        services: {
          create: [
            {
              serviceCodeSnapshot: code,
              serviceNameSnapshot:
                x.service === "replace"
                  ? "استبدال بلاور حمام"
                  : x.service === "install_only"
                    ? "تركيب بلاور العميل"
                    : "تركيب بلاور حمام جديد",
              qty: 1,
              unitPriceSnapshot: unitPrice,
            },
          ],
        },
      });
    });

    (b.kitchens || []).forEach((x: any, i: number) => {
      const services: any[] = [];

      function addService(
        code: string,
        name: string,
        qty: number,
        fallbackPrice: number,
      ) {
        const unitPrice = prices[code] ?? fallbackPrice;
        services.push({
          serviceCodeSnapshot: code,
          serviceNameSnapshot: name,
          qty,
          unitPriceSnapshot: unitPrice,
        });
        serviceCodes.push(code);
        subtotal += qty * unitPrice;
      }

      if (x.fan) {
        addService(
          "KITCHEN_FAN",
          "تركيب بلاور مطبخ",
          1,
          400,
        );
      }

      if (x.hood) {
        addService(
          "HOOD",
          "تركيب هود",
          1,
          500,
        );
      }

      if (x.external) {
        addService(
          "EXTERNAL_FAN",
          "مروحة طرد خارجية",
          1,
          500,
        );
      }

      if (+x.duct > 0) {
        addService(
          "DUCT_METER",
          "خط طرد بالمتر",
          +x.duct,
          250,
        );
      }

      spaces.push({
        type: "KITCHEN",
        label: `مطبخ ${i + 1}`,
        details: x,
        services: { create: services },
      });
    });

    const offer = await calculateOrderOffer(prisma, {
      governorate,
      area,
      couponCode: b?.couponCode,
      subtotal,
      serviceCodes,
    });

    if (offer.serviceArea && !offer.serviceArea.active) {
      return NextResponse.json(
        { error: "المنطقة غير متاحة للخدمة حاليًا" },
        { status: 400 },
      );
    }

    if (clean(b?.couponCode) && !offer.couponValid) {
      return NextResponse.json(
        {
          error:
            offer.couponReason ||
            "كود الخصم غير صالح",
        },
        { status: 400 },
      );
    }

    const orderNo = `VP-${new Date().getFullYear()}-${Date.now()
      .toString()
      .slice(-7)}`;

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNo,
          customerId: customer.id,
          propertyId: property.id,
          estimatedTotal: offer.total,
          travelFeeSnapshot: offer.travelFee,
          couponCodeSnapshot:
            offer.couponValid && offer.coupon
              ? offer.coupon.code
              : null,
          couponDiscountSnapshot: offer.discount,
          acquisitionSource:
            clean(b?.source) || null,
          governorate,
          area,
          address,
          preferredDate: c.date,
          preferredTime: c.time,
          estimateAccepted: true,
          spaces: { create: spaces },
        },
      });

      if (offer.couponValid && offer.coupon) {
        await tx.coupon.update({
          where: { id: offer.coupon.id },
          data: {
            usedCount: {
              increment: 1,
            },
          },
        });
      }

      const leadId = clean(b?.leadId);
      if (leadId) {
        const lead = await tx.lead.findUnique({
          where: { id: leadId },
        });

        if (lead && lead.status !== "CONVERTED") {
          await tx.lead.update({
            where: { id: lead.id },
            data: {
              status: "CONVERTED",
              convertedOrderId: order.id,
              lastActivityAt: new Date(),
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          orderId: order.id,
          actorLabel: "النظام",
          action: "ORDER_CREATED",
          newValue: {
            propertyId: property.id,
            subtotal,
            travelFee: offer.travelFee,
            couponCode:
              offer.couponValid && offer.coupon
                ? offer.coupon.code
                : null,
            couponDiscount: offer.discount,
            estimatedTotal: offer.total,
            acquisitionSource:
              clean(b?.source) || null,
          },
        },
      });

      return order;
    });

    await notifyAdmins({
      type: AdminNotificationType.NEW_ORDER,
      title: "طلب جديد وصل",
      message: `${result.orderNo} — ${customer.name}${
        area ? ` — ${area}` : ""
      }`,
      orderId: result.id,
      href: `/admin/orders/${result.id}`,
    });

    return NextResponse.json({
      orderNo: result.orderNo,
      estimatedTotal: Number(result.estimatedTotal || 0),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "تعذر إنشاء الطلب" },
      { status: 500 },
    );
  }
}
