import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";

export async function GET(req: Request) {
  try {
    await requirePermission(PERMISSIONS.GLOBAL_SEARCH);

    const q = new URL(req.url).searchParams.get("q")?.trim() || "";

    if (q.length < 2) {
      return NextResponse.json({ groups: [] });
    }

    const [
      orders,
      customers,
      invoices,
      technicians,
      properties,
      devices,
      suppliers,
      purchases,
    ] = await Promise.all([
      prisma.order.findMany({
        where: {
          OR: [
            { orderNo: { contains: q, mode: "insensitive" } },
            { area: { contains: q, mode: "insensitive" } },
            { address: { contains: q, mode: "insensitive" } },
            {
              customer: {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { phone: { contains: q } },
                ],
              },
            },
            {
              technician: {
                name: { contains: q, mode: "insensitive" },
              },
            },
          ],
        },
        include: {
          customer: { select: { name: true, phone: true } },
          technician: { select: { name: true } },
        },
        take: 8,
        orderBy: { createdAt: "desc" },
      }),
      prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        },
        take: 8,
        orderBy: { createdAt: "desc" },
      }),
      prisma.invoice.findMany({
        where: {
          OR: [
            { invoiceNo: { contains: q, mode: "insensitive" } },
            {
              order: {
                OR: [
                  { orderNo: { contains: q, mode: "insensitive" } },
                  {
                    customer: {
                      OR: [
                        { name: { contains: q, mode: "insensitive" } },
                        { phone: { contains: q } },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
        include: {
          order: {
            select: {
              id: true,
              orderNo: true,
              customer: { select: { name: true } },
            },
          },
        },
        take: 8,
        orderBy: { issuedAt: "desc" },
      }),
      prisma.user.findMany({
        where: {
          role: "TECHNICIAN",
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          active: true,
        },
        take: 8,
        orderBy: { name: "asc" },
      }),
      prisma.property.findMany({
        where: {
          OR: [
            { label: { contains: q, mode: "insensitive" } },
            { area: { contains: q, mode: "insensitive" } },
            { address: { contains: q, mode: "insensitive" } },
            {
              customer: {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { phone: { contains: q } },
                ],
              },
            },
          ],
        },
        include: {
          customer: { select: { id: true, name: true } },
        },
        take: 8,
        orderBy: { createdAt: "desc" },
      }),
      prisma.device.findMany({
        where: {
          OR: [
            { type: { contains: q, mode: "insensitive" } },
            { brand: { contains: q, mode: "insensitive" } },
            { model: { contains: q, mode: "insensitive" } },
            { size: { contains: q, mode: "insensitive" } },
            {
              property: {
                customer: {
                  name: { contains: q, mode: "insensitive" },
                },
              },
            },
          ],
        },
        include: {
          property: {
            select: {
              customerId: true,
              label: true,
              customer: { select: { name: true } },
            },
          },
        },
        take: 8,
        orderBy: { createdAt: "desc" },
      }),
      prisma.supplier.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            { taxNumber: { contains: q } },
          ],
        },
        take: 8,
        orderBy: { createdAt: "desc" },
      }),
      prisma.purchaseReceipt.findMany({
        where: {
          OR: [
            { receiptNo: { contains: q, mode: "insensitive" } },
            { supplierInvoiceNo: { contains: q, mode: "insensitive" } },
            {
              supplier: {
                name: { contains: q, mode: "insensitive" },
              },
            },
          ],
        },
        include: {
          supplier: { select: { name: true } },
        },
        take: 8,
        orderBy: { receivedAt: "desc" },
      }),
    ]);

    const groups = [
      {
        key: "orders",
        label: "الطلبات",
        items: orders.map((item) => ({
          id: item.id,
          title: item.orderNo,
          meta: `${item.customer.name} — ${item.customer.phone} — ${item.area || "-"}`,
          href: `/admin/orders/${item.id}`,
        })),
      },
      {
        key: "customers",
        label: "العملاء",
        items: customers.map((item) => ({
          id: item.id,
          title: item.name,
          meta: item.phone,
          href: `/admin/customers/${item.id}`,
        })),
      },
      {
        key: "invoices",
        label: "الفواتير",
        items: invoices.map((item) => ({
          id: item.id,
          title: item.invoiceNo,
          meta: `${item.order.orderNo} — ${item.order.customer.name} — ${Number(item.due).toLocaleString("ar-EG")} ج متبقي`,
          href: `/admin/orders/${item.order.id}#financials`,
        })),
      },
      {
        key: "technicians",
        label: "الفنيون",
        items: technicians.map((item) => ({
          id: item.id,
          title: item.name,
          meta: `${item.phone || item.email} — ${item.active ? "نشط" : "موقوف"}`,
          href: `/admin/technicians/${item.id}`,
        })),
      },
      {
        key: "properties",
        label: "العقارات",
        items: properties.map((item) => ({
          id: item.id,
          title: item.label || `${item.area} — ${item.address}`,
          meta: `${item.customer.name} — ${item.area} — ${item.address}`,
          href: `/admin/customers/${item.customer.id}`,
        })),
      },
      {
        key: "devices",
        label: "الأجهزة",
        items: devices.map((item) => ({
          id: item.id,
          title: [item.type, item.brand, item.model].filter(Boolean).join(" — "),
          meta: `${item.property.customer.name} — ${item.property.label || "عقار"}`,
          href: `/admin/customers/${item.property.customerId}`,
        })),
      },
      {
        key: "suppliers",
        label: "الموردون",
        items: suppliers.map((item) => ({
          id: item.id,
          title: item.name,
          meta: item.phone || item.taxNumber || "مورد",
          href: "/admin/purchases",
        })),
      },
      {
        key: "purchases",
        label: "التوريدات",
        items: purchases.map((item) => ({
          id: item.id,
          title: item.receiptNo,
          meta: `${item.supplier.name} — ${Number(item.total).toLocaleString("ar-EG")} ج`,
          href: "/admin/purchases",
        })),
      },
    ].filter((group) => group.items.length > 0);

    return NextResponse.json({ groups });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "تعذر تنفيذ البحث" },
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
