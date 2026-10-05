import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function clean(value: unknown) {
  return String(value || "").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = clean(body?.id);
    const phone = clean(body?.phone) || null;
    const name = clean(body?.name) || null;
    const source = clean(body?.source) || null;
    const currentStep = Math.min(
      4,
      Math.max(1, Number(body?.currentStep || 1)),
    );
    const consentToFollowUp = Boolean(body?.consentToFollowUp);
    const payload =
      body?.payload && typeof body.payload === "object"
        ? body.payload
        : {};

    if (phone && !/^01\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: "رقم الموبايل غير صحيح" },
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
      const existing = await prisma.lead.findUnique({
        where: { id },
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

    const created = await prisma.lead.create({
      data,
    });

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
