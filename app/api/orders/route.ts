import { AdminNotificationType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/admin-notifications";
import { calculateOrderOffer } from "@/lib/promotions";
import { notifyCustomer } from "@/lib/customer-notifications";
import { createOrderUploadToken } from "@/lib/customer-order-upload";
import { acquisitionSourceFromRequest } from "@/lib/marketing-attribution";
import { getRuntimeControl } from "@/lib/runtime-control";
import {
  findActiveReferral,
  referralCodeFromRequest,
  referralDiscountAmount,
  REFERRAL_REDEEMED,
} from "@/lib/referrals";
import {
  clientIp,
  durableRateLimit,
  rateLimitHeaders,
} from "@/lib/request-security";
import {
  claimIdempotency,
  failIdempotency,
  hashIdempotencyPayload,
  normalizeIdempotencyKey,
} from "@/lib/request-idempotency";

const bp: Record<string, number> = {
  new: 350,
  replace: 400,
  install_only: 300,
};

function clean(value: unknown) {
  return String(value || "").trim();
}

export async function POST(req: Request) {
  let idempotencyClaimId:
    | string
    | null = null;

  try {
    const {
      control,
    } = await getRuntimeControl();

    if (
      control.mode !== "NORMAL" ||
      !control.detailedOrders
    ) {
      return NextResponse.json(
        {
          error:
            control.maintenanceMessage,
          leadOnly: true,
          fallbackWhatsapp:
            control.fallbackWhatsapp,
          supportPhone:
            control.supportPhone,
        },
        { status: 503 },
      );
    }

    const limited =
      await durableRateLimit(
        `public-order:${clientIp(req)}`,
        {
          limit: 20,
          windowMs:
            60 * 60 * 1000,
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

    const rawIdempotencyKey =
      req.headers.get(
        "idempotency-key",
      );
    const idempotencyKey =
      rawIdempotencyKey
        ? normalizeIdempotencyKey(
            rawIdempotencyKey,
          )
        : null;

    if (
      rawIdempotencyKey &&
      !idempotencyKey
    ) {
      return NextResponse.json(
        {
          code:
            "INVALID_IDEMPOTENCY_KEY",
          error:
            "تعذر تأكيد محاولة إنشاء الطلب. أعد تحميل الصفحة وحاول مرة أخرى.",
        },
        { status: 400 },
      );
    }

    const requestHash =
      idempotencyKey
        ? hashIdempotencyPayload(
            b,
          )
        : null;

    const c = b.customer || {};
    const customerName = clean(c.name);
    const customerPhone = clean(c.phone).replace(/\D/g, "");

    if (
      customerName.length < 2 ||
      !/^01\d{9}$/.test(customerPhone) ||
      b?.legalAccepted !== true
    ) {
      return NextResponse.json(
        {
          error:
            "الاسم ورقم الموبايل والموافقة على الشروط بيانات مطلوبة",
        },
        { status: 400 },
      );
    }

    const phoneLimited =
      await durableRateLimit(
        `public-order-phone:${customerPhone}`,
        {
          limit: 5,
          windowMs:
            60 * 60 * 1000,
        },
      );

    if (!phoneLimited.allowed) {
      return NextResponse.json(
        {
          error:
            "تم تجاوز عدد الطلبات المسموح به لهذا الرقم مؤقتًا.",
        },
        {
          status: 429,
          headers:
            rateLimitHeaders(
              phoneLimited,
            ),
        },
      );
    }

    const rawEmail = clean(c.email).toLowerCase();

    if (
      rawEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)
    ) {
      return NextResponse.json(
        { error: "البريد الإلكتروني غير صحيح" },
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

    const email = rawEmail || null;
    const acquisitionSource =
      control.marketingTracking
        ? acquisitionSourceFromRequest(
            req,
            b?.source,
          )
        : null;

    const existingCustomer =
      await prisma.customer.findUnique({
        where: {
          phone: customerPhone,
        },
      });

    if (
      existingCustomer?.archivedAt
    ) {
      return NextResponse.json(
        {
          error:
            "هذا الرقم مرتبط بسجل مؤرشف. تواصل مع Ventic Pro.",
        },
        { status: 409 },
      );
    }

    const governorate =
      clean(c.governorate) ||
      "غير محدد";
    const area =
      clean(c.area) ||
      "غير محدد";
    const address =
      clean(c.address) ||
      "غير محدد";

    const spaces: any[] = [];
    const serviceCodes: string[] = [];
    let subtotal = 0;

    (b.baths || []).forEach((x: any, i: number) => {
      const code = `BATH_${String(x.service).toUpperCase()}`;
      const unitPrice = prices[code] ?? bp[x.service] ?? 0;

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
        addService("KITCHEN_FAN", "تركيب بلاور مطبخ", 1, 400);
      }

      if (x.hood) {
        addService("HOOD", "تركيب هود", 1, 500);
      }

      if (x.external) {
        addService("EXTERNAL_FAN", "مروحة طرد خارجية", 1, 500);
      }

      if (+x.duct > 0) {
        addService("DUCT_METER", "خط طرد بالمتر", +x.duct, 250);
      }

      spaces.push({
        type: "KITCHEN",
        label: `مطبخ ${i + 1}`,
        details: x,
        services: { create: services },
      });
    });

    const offer =
      control.estimates
        ? await calculateOrderOffer(
            prisma,
            {
              governorate,
              area,
              couponCode:
                control.coupons
                  ? b?.couponCode
                  : undefined,
              subtotal,
              serviceCodes,
            },
          )
        : {
            subtotal,
            travelFee: 0,
            discount: 0,
            total: subtotal,
            coupon: null,
            couponValid: false,
            couponReason: null,
            serviceArea: null,
          };

    if (offer.serviceArea && !offer.serviceArea.active) {
      return NextResponse.json(
        { error: "المنطقة غير متاحة للخدمة حاليًا" },
        { status: 400 },
      );
    }

    if (clean(b?.couponCode) && !offer.couponValid) {
      return NextResponse.json(
        {
          error: offer.couponReason || "كود الخصم غير صالح",
        },
        { status: 400 },
      );
    }

    // A referral discount does not stack with a normal coupon.
    const referralCookie = referralCodeFromRequest(req);
    const referral =
      !offer.couponValid && referralCookie
        ? await findActiveReferral(prisma, referralCookie)
        : null;
    const referralDiscount = referral
      ? referralDiscountAmount(Number(offer.total), referral)
      : 0;
    const estimatedTotal = Math.max(
      0,
      Math.round((Number(offer.total) - referralDiscount) * 100) / 100,
    );

    if (
      idempotencyKey &&
      requestHash
    ) {
      const claim =
        await claimIdempotency({
          scope:
            "PUBLIC_ORDER",
          key:
            idempotencyKey,
          requestHash,
        });

      if (
        claim.kind ===
        "CONFLICT"
      ) {
        return NextResponse.json(
          {
            code:
              "IDEMPOTENCY_CONFLICT",
            error:
              "تم استخدام محاولة الإرسال الحالية مع بيانات مختلفة. أعد المحاولة من النموذج.",
          },
          { status: 409 },
        );
      }

      if (
        claim.kind ===
        "IN_PROGRESS"
      ) {
        return NextResponse.json(
          {
            code:
              "IDEMPOTENCY_IN_PROGRESS",
            error:
              "الطلب قيد الحفظ بالفعل. حاول مرة أخرى بعد لحظات.",
            retryAfterSeconds: 1,
          },
          {
            status: 409,
            headers: {
              "Retry-After":
                "1",
            },
          },
        );
      }

      if (
        claim.kind ===
        "REPLAY"
      ) {
        const replay =
          claim.response as {
            orderId: string;
            orderNo: string;
            estimatedTotal: number;
            referralApplied:
              | string
              | null;
            referralDiscount: number;
          };

        return NextResponse.json({
          ...replay,
          uploadToken:
            createOrderUploadToken(
              replay.orderId,
            ),
          idempotentReplay:
            true,
        });
      }

      idempotencyClaimId =
        claim.id;
    }

    const orderNo = `VP-${new Date().getFullYear()}-${Date.now()
      .toString()
      .slice(-7)}`;

    const result = await prisma.$transaction(async (tx) => {
      const customer =
        await tx.customer.upsert({
          where: {
            phone:
              customerPhone,
          },
          update: {},
          create: {
            name:
              customerName,
            phone:
              customerPhone,
            email,
          },
        });

      if (
        customer.archivedAt
      ) {
        throw new Error(
          "CUSTOMER_ARCHIVED",
        );
      }

      let property =
        await tx.property.findFirst({
          where: {
            customerId:
              customer.id,
            governorate,
            area,
            address,
          },
          orderBy: {
            createdAt:
              "asc",
          },
        });

      if (!property) {
        const propertyCount =
          await tx.property.count({
            where: {
              customerId:
                customer.id,
            },
          });

        property =
          await tx.property.create({
            data: {
              customerId:
                customer.id,
              label:
                clean(
                  c.propertyLabel,
                ) ||
                (propertyCount ===
                0
                  ? "العنوان الرئيسي"
                  : `عقار ${propertyCount + 1}`),
              governorate,
              area,
              address,
              building:
                clean(
                  c.building,
                ) ||
                null,
              floor:
                clean(
                  c.floor,
                ) ||
                null,
              apartment:
                clean(
                  c.apartment,
                ) ||
                null,
            },
          });
      }

      const order = await tx.order.create({
        data: {
          orderNo,
          customerId: customer.id,
          propertyId: property.id,
          estimatedTotal,
          travelFeeSnapshot: offer.travelFee,
          couponCodeSnapshot:
            offer.couponValid && offer.coupon
              ? offer.coupon.code
              : referral
                ? `REF:${referral.code}`
                : null,
          couponDiscountSnapshot:
            Math.round((Number(offer.discount || 0) + referralDiscount) * 100) / 100,
          acquisitionSource,
          governorate,
          area,
          address,
          preferredDate: clean(c.date) || null,
          preferredTime: clean(c.time) || null,
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

      if (referral) {
        await tx.auditLog.create({
          data: {
            orderId: order.id,
            actorLabel: "النظام",
            action: REFERRAL_REDEEMED,
            newValue: {
              referralId: referral.id,
              code: referral.code,
              discount: referralDiscount,
              benefitLabel: referral.benefitLabel,
            },
          },
        });
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
            referralCode: referral?.code || null,
            referralDiscount,
            estimatedTotal,
            acquisitionSource,
            legalAccepted: true,
            policyVersion: clean(b?.policyVersion) || "2026-10-07",
            customerEmail: email,
          },
        },
      });

      const responsePayload = {
        orderId:
          order.id,
        orderNo:
          order.orderNo,
        estimatedTotal:
          Number(
            order.estimatedTotal ||
              0,
          ),
        referralApplied:
          referral?.code ||
          null,
        referralDiscount,
      };

      if (
        idempotencyClaimId
      ) {
        await tx.idempotencyRequest.update({
          where: {
            id:
              idempotencyClaimId,
          },
          data: {
            status:
              "COMPLETED",
            resourceId:
              order.id,
            response:
              responsePayload,
            expiresAt:
              new Date(
                Date.now() +
                  24 *
                    60 *
                    60 *
                    1000,
              ),
          },
        });
      }

      return {
        ...order,
        customer,
        responsePayload,
      };
    });

    const customer =
      result.customer;

    await notifyAdmins({
      type: AdminNotificationType.NEW_ORDER,
      title: "طلب جديد وصل",
      message: `${result.orderNo} — ${customer.name}${area ? ` — ${area}` : ""}`,
      orderId: result.id,
      href: `/admin/orders/${result.id}`,
      dedupeKey:
        `new-order:${result.id}`,
    });

    await notifyCustomer({
      orderId: result.id,
      customerId: customer.id,
      phone: customer.phone,
      email: customer.email,
      templateKey: "ORDER_RECEIVED",
      templateVariables: [
        customer.name,
        result.orderNo,
        clean(c.date) || "سيتم تحديده بالتواصل",
        clean(c.time) || "سيتم تحديدها بالتواصل",
        Number(result.estimatedTotal || 0).toLocaleString("ar-EG"),
      ],
      subject: `تم استلام طلب ${result.orderNo}`,
      message:
        `Ventic Pro\nتم استلام طلبك ${result.orderNo} بنجاح. ` +
        `الموعد ${clean(c.date) || "سيتم تحديده"} — ${clean(c.time) || "بالتواصل"}. ` +
        `السعر التقديري الحالي ${Number(result.estimatedTotal || 0).toLocaleString("ar-EG")} ج.`,
      payload: {
        preferredDate: clean(c.date) || null,
        preferredTime: clean(c.time) || null,
        estimatedTotal: Number(result.estimatedTotal || 0),
      },
    });

    return NextResponse.json({
      ...result.responsePayload,
      uploadToken:
        createOrderUploadToken(
          result.id,
        ),
      idempotentReplay:
        false,
    });
  } catch (error) {
    if (
      idempotencyClaimId
    ) {
      await failIdempotency(
        idempotencyClaimId,
      );
    }

    console.error(error);

    if (
      error instanceof Error &&
      error.message ===
        "CUSTOMER_ARCHIVED"
    ) {
      return NextResponse.json(
        {
          error:
            "هذا الرقم مرتبط بسجل مؤرشف. تواصل مع Ventic Pro.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "تعذر إنشاء الطلب" },
      { status: 500 },
    );
  }
}
