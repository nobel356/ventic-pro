import { NextResponse } from "next/server";
import {
  requireArchiveActor,
  requireVaultUnlocked,
} from "@/lib/archive-vault";
import { PERMISSIONS } from "@/lib/permission-config";
import { rawPrisma } from "@/lib/prisma";

const allowedTypes = new Set([
  "customers",
  "leads",
  "suppliers",
  "inventory",
]);

export async function GET(req: Request) {
  try {
    const actor = await requireArchiveActor(
      PERMISSIONS.ARCHIVE_MANAGE,
    );
    await requireVaultUnlocked(actor.id);

    const url = new URL(req.url);
    const type = String(url.searchParams.get("type") || "");
    const q = String(url.searchParams.get("q") || "").trim();

    if (!allowedTypes.has(type)) {
      return NextResponse.json(
        { error: "نوع الأرشفة غير صحيح." },
        { status: 400 },
      );
    }

    if (q.length < 2) {
      return NextResponse.json({ items: [] });
    }

    if (type === "customers") {
      const items = await rawPrisma.customer.findMany({
        where: {
          archivedAt: null,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          active: true,
          _count: {
            select: {
              orders: true,
              properties: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      });

      return NextResponse.json({
        items: items.map((item) => ({
          id: item.id,
          label: item.name,
          meta: `${item.phone}${item.email ? ` — ${item.email}` : ""} — ${item._count.orders} طلب — ${item._count.properties} عقار`,
        })),
      });
    }

    if (type === "leads") {
      const items = await rawPrisma.lead.findMany({
        where: {
          archivedAt: null,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            { source: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          phone: true,
          source: true,
          status: true,
          currentStep: true,
        },
        orderBy: { lastActivityAt: "desc" },
        take: 30,
      });

      return NextResponse.json({
        items: items.map((item) => ({
          id: item.id,
          label: item.name || item.phone || "Lead",
          meta: `${item.phone || "بدون هاتف"} — ${item.source || "بدون مصدر"} — ${item.status} — خطوة ${item.currentStep}/4`,
        })),
      });
    }

    if (type === "suppliers") {
      const items = await rawPrisma.supplier.findMany({
        where: {
          archivedAt: null,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            { taxNumber: { contains: q } },
          ],
        },
        select: {
          id: true,
          name: true,
          phone: true,
          taxNumber: true,
          active: true,
          _count: {
            select: {
              purchases: true,
            },
          },
        },
        orderBy: { name: "asc" },
        take: 30,
      });

      return NextResponse.json({
        items: items.map((item) => ({
          id: item.id,
          label: item.name,
          meta: `${item.phone || "بدون هاتف"}${item.taxNumber ? ` — ضريبي ${item.taxNumber}` : ""} — ${item._count.purchases} توريد`,
        })),
      });
    }

    const items = await rawPrisma.inventoryItem.findMany({
      where: {
        archivedAt: null,
        OR: [
          { sku: { contains: q, mode: "insensitive" } },
          { nameAr: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        sku: true,
        nameAr: true,
        unit: true,
        quantity: true,
        active: true,
      },
      orderBy: { nameAr: "asc" },
      take: 30,
    });

    return NextResponse.json({
      items: items.map((item) => ({
        id: item.id,
        label: `${item.sku} — ${item.nameAr}`,
        meta: `رصيد الشركة ${Number(item.quantity).toLocaleString("ar-EG")} ${item.unit}`,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "تعذر البحث داخل العناصر النشطة." },
      {
        status:
          error?.message === "UNAUTHENTICATED"
            ? 401
            : 403,
      },
    );
  }
}
