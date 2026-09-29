import { AdminNotificationType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/admin-notifications";

const bp: Record<string, number> = {
  new: 350,
  replace: 400,
  install_only: 300,
};

export async function POST(req: Request) {
  try {
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

    const configured = await prisma.service.findMany({ where: { active: true } });
    const prices = Object.fromEntries(
      configured.map((service) => [service.code, Number(service.priceFrom)]),
    );

    const customer = await prisma.customer.upsert({
      where: { phone: c.phone },
      update: { name: c.name },
      create: { name: c.name, phone: c.phone },
    });

    const spaces: any[] = [];

    (b.baths || []).forEach((x: any, i: number) =>
      spaces.push({
        type: "BATHROOM",
        label: `حمام ${i + 1}`,
        details: x,
        services: {
          create: [
            {
              serviceCodeSnapshot: `BATH_${x.service}`,
              serviceNameSnapshot:
                x.service === "replace"
                  ? "استبدال بلاور حمام"
                  : x.service === "install_only"
                    ? "تركيب بلاور العميل"
                    : "تركيب بلاور حمام جديد",
              qty: 1,
              unitPriceSnapshot:
                prices[`BATH_${String(x.service).toUpperCase()}`] ??
                bp[x.service] ??
                0,
            },
          ],
        },
      }),
    );

    (b.kitchens || []).forEach((x: any, i: number) => {
      const services: any[] = [];
      if (x.fan)
        services.push({
          serviceCodeSnapshot: "KITCHEN_FAN",
          serviceNameSnapshot: "تركيب بلاور مطبخ",
          qty: 1,
          unitPriceSnapshot: prices.KITCHEN_FAN ?? 400,
        });
      if (x.hood)
        services.push({
          serviceCodeSnapshot: "HOOD",
          serviceNameSnapshot: "تركيب هود",
          qty: 1,
          unitPriceSnapshot: prices.HOOD ?? 500,
        });
      if (x.external)
        services.push({
          serviceCodeSnapshot: "EXTERNAL_FAN",
          serviceNameSnapshot: "مروحة طرد خارجية",
          qty: 1,
          unitPriceSnapshot: prices.EXTERNAL_FAN ?? 500,
        });
      if (+x.duct > 0)
        services.push({
          serviceCodeSnapshot: "DUCT_METER",
          serviceNameSnapshot: "خط طرد بالمتر",
          qty: +x.duct,
          unitPriceSnapshot: prices.DUCT_METER ?? 250,
        });

      spaces.push({
        type: "KITCHEN",
        label: `مطبخ ${i + 1}`,
        details: x,
        services: { create: services },
      });
    });

    const orderNo = `VP-${new Date().getFullYear()}-${Date.now()
      .toString()
      .slice(-7)}`;

    const order = await prisma.order.create({
      data: {
        orderNo,
        customerId: customer.id,
        estimatedTotal: b.estimatedTotal,
        governorate: c.governorate,
        area: c.area,
        address: c.address,
        preferredDate: c.date,
        preferredTime: c.time,
        estimateAccepted: true,
        spaces: { create: spaces },
      },
    });

    await notifyAdmins({
      type: AdminNotificationType.NEW_ORDER,
      title: "طلب جديد وصل",
      message: `${order.orderNo} — ${customer.name}${c.area ? ` — ${c.area}` : ""}`,
      orderId: order.id,
      href: `/admin/orders/${order.id}`,
    });

    return NextResponse.json({ orderNo: order.orderNo });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "تعذر إنشاء الطلب" }, { status: 500 });
  }
}
