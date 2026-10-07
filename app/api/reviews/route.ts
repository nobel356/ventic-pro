import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentCustomer } from "@/lib/customer-auth";

const fields = [
  "overall",
  "punctuality",
  "professionalism",
  "installationQuality",
  "cleanliness",
  "communication",
  "valueForMoney",
] as const;

export async function POST(req: Request) {
  const customer = await currentCustomer();

  if (!customer) {
    return NextResponse.json(
      { error: "UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();
    const orderId = String(body?.orderId || "");

    if (
      !orderId ||
      fields.some((key) => {
        const value = Number(body?.[key]);
        return !Number.isInteger(value) || value < 1 || value > 5;
      })
    ) {
      return NextResponse.json(
        { error: "كل التقييمات يجب أن تكون من 1 إلى 5" },
        { status: 400 },
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        customerId: customer.id,
      },
      select: {
        id: true,
        status: true,
        technicianId: true,
        orderNo: true,
      },
    });

    if (!order || order.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "التقييم متاح لطلباتك المكتملة فقط" },
        { status: 400 },
      );
    }

    const comment = String(body?.comment || "").trim().slice(0, 1200) || null;
    const arrivalNote = String(body?.arrivalNote || "").trim().slice(0, 300) || null;
    const publicConsent = body?.publicConsent === true;

    const review = await prisma.review.create({
      data: {
        orderId,
        technicianId: order.technicianId,
        overall: Number(body.overall),
        punctuality: Number(body.punctuality),
        professionalism: Number(body.professionalism),
        installationQuality: Number(body.installationQuality),
        cleanliness: Number(body.cleanliness),
        communication: Number(body.communication),
        valueForMoney: Number(body.valueForMoney),
        arrivalNote,
        comment,
        publicConsent,
        isPublished: false,
      },
    });

    await prisma.auditLog.create({
      data: {
        orderId,
        actorLabel: `العميل: ${customer.name}`,
        action: "CUSTOMER_REVIEW_CREATED",
        newValue: {
          reviewId: review.id,
          overall: review.overall,
          publicConsent,
        },
      },
    });

    return NextResponse.json({ ok: true, reviewId: review.id });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "تم تقييم هذا الطلب بالفعل" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: error?.message || "تعذر حفظ التقييم" },
      { status: 500 },
    );
  }
}
