import { AdminNotificationType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/admin-notifications";
import { acquisitionSourceFromRequest } from "@/lib/marketing-attribution";
import {
  clientIp,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/request-security";

function clean(value: unknown) {
  return String(value || "").trim();
}

function requestTypeFromPayload(
  payload: Record<string, unknown>,
) {
  const value = clean(payload?.requestType);

  return value === "QUICK_REQUEST" ||
    value === "DETAILED_ENTRY"
    ? value
    : "";
}

export async function POST(req: Request) {
  try {
    const limited = rateLimit(
      `public-lead:${clientIp(req)}`,
      {
        limit: 60,
        windowMs: 60 * 60 * 1000,
      },
    );

    if (!limited.allowed) {
      return NextResponse.json(
        { error: "تم تجاوز عدد المحاولات مؤقتًا." },
        {
          status: 429,
          headers: rateLimitHeaders(limited),
        },
      );
    }

    const body = await req.json();
    const id = clean(body?.id);
    const phone =
      clean(body?.phone).replace(/\D/g, "") || null;
    const name = clean(body?.name) || null;
    const source =
      acquisitionSourceFromRequest(
        req,
        body?.source,
      );
    const currentStep = Math.min(
      4,
      Math.max(1, Number(body?.currentStep || 1)),
    );
    const consentToFollowUp = Boolean(body?.consentToFollowUp);
    const payload =
      body?.payload &&
      typeof body.payload === "object" &&
      !Array.isArray(body.payload)
        ? (body.payload as Record<string, unknown>)
        : {};
    const requestType = requestTypeFromPayload(payload);
    const intent = clean(payload?.intent);

    if (phone && !/^01\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: "رقم الموبايل غير صحيح" },
        { status: 400 },
      );
    }

    if (
      requestType &&
      (!name || name.length < 2 || !phone)
    ) {
      return NextResponse.json(
        { error: "الاسم ورقم الموبايل مطلوبان." },
        { status: 400 },
      );
    }

    const data = {
      phone,
      name,
      source,
      currentStep,
      payload,
      consentToFollowUp,
      lastActivityAt: new Date(),
    };

    if (id) {
      const existing = await prisma.lead.findFirst({
        where: {
          id,
          archivedAt: null,
        },
      });

      if (!existing || existing.status === "CONVERTED") {
        return NextResponse.json(
          { error: "المتابعة غير متاحة" },
          { status: 404 },
        );
      }

      const updated = await prisma.lead.update({
        where: { id },
        data,
      });

      return NextResponse.json({
        id: updated.id,
      });
    }

    if (requestType && phone) {
      const recent = await prisma.lead.findFirst({
        where: {
          archivedAt: null,
          phone,
          status: {
            not: "CONVERTED",
          },
          lastActivityAt: {
            gte: new Date(
              Date.now() - 24 * 60 * 60 * 1000,
            ),
          },
        },
        orderBy: {
          lastActivityAt: "desc",
        },
      });

      if (recent) {
        const updated = await prisma.lead.update({
          where: { id: recent.id },
          data: {
            ...data,
            status: "STARTED",
          },
        });

        return NextResponse.json({
          id: updated.id,
          deduplicated: true,
        });
      }
    }

    const created = await prisma.lead.create({
      data,
    });

    if (requestType === "QUICK_REQUEST") {
      const callback = intent === "CALLBACK";

      await notifyAdmins({
        type: AdminNotificationType.SYSTEM,
        title: callback ? "طلب اتصال جديد" : "طلب سريع جديد",
        message: callback
          ? `${name} — ${phone} — يريد مكالمة`
          : `${name} — ${phone}`,
        href: "/admin/leads",
        dedupeKey: `${callback ? "callback" : "quick-lead"}:${created.id}`,
      });
    }

    return NextResponse.json(
      { id: created.id },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "تعذر حفظ تقدم الطلب" },
      { status: 500 },
    );
  }
}
