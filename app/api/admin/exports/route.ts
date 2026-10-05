import { prisma } from "@/lib/prisma";
import {
  can,
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";
import {
  buildExcelXmlWorkbook,
  excelResponse,
  type ExcelSheet,
} from "@/lib/excel-xml";
import { technicianBalanceMap } from "@/lib/inventory-balances";
import { parseInventoryNote } from "@/lib/inventory";

function n(value: unknown) {
  return Number(value || 0);
}

async function inventorySheets(
  canViewCost: boolean,
): Promise<ExcelSheet[]> {
  const [items, technicians, movements] =
    await Promise.all([
      prisma.inventoryItem.findMany({
        orderBy: { nameAr: "asc" },
      }),
      prisma.user.findMany({
        where: { role: "TECHNICIAN" },
        select: {
          id: true,
          name: true,
          active: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.inventoryMovement.findMany({
        include: {
          item: {
            select: {
              sku: true,
              nameAr: true,
              unit: true,
            },
          },
          technician: {
            select: { name: true },
          },
          order: {
            select: { orderNo: true },
          },
          purchaseReceipt: {
            select: { receiptNo: true },
          },
          stocktake: {
            select: { stocktakeNo: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const balances =
    await technicianBalanceMap(prisma);

  const headers = [
    "الكود",
    "الصنف",
    "الوحدة",
    "رصيد الشركة",
    "عهد الفنيين",
    "الإجمالي",
    "حد إعادة الطلب",
    "الحالة",
  ];

  if (canViewCost) {
    headers.push(
      "آخر تكلفة",
      "متوسط التكلفة",
      "قيمة رصيد الشركة",
    );
  }

  const inventoryRows = items.map((item) => {
    const techTotal = technicians.reduce(
      (sum, tech) =>
        sum +
        (balances.get(
          `${tech.id}:${item.id}`,
        ) || 0),
      0,
    );
    const company = n(item.quantity);

    const row: Array<
      string | number | boolean | Date
    > = [
      item.sku,
      item.nameAr,
      item.unit,
      company,
      techTotal,
      company + techTotal,
      n(item.reorderLevel),
      item.active ? "نشط" : "موقوف",
    ];

    if (canViewCost) {
      row.push(
        n(item.lastUnitCost),
        n(item.averageUnitCost),
        company *
          n(item.averageUnitCost),
      );
    }

    return row;
  });

  const custodyRows: any[][] = [];
  for (const tech of technicians) {
    for (const item of items) {
      const qty =
        balances.get(
          `${tech.id}:${item.id}`,
        ) || 0;
      if (
        Math.abs(qty) < 0.000001
      )
        continue;

      custodyRows.push([
        tech.name,
        tech.active ? "نشط" : "موقوف",
        item.sku,
        item.nameAr,
        item.unit,
        qty,
      ]);
    }
  }

  const movementRows =
    movements.map((movement) => {
      const parsed =
        parseInventoryNote(
          movement.note,
        );

      return [
        movement.createdAt,
        movement.type,
        parsed.marker,
        movement.item.sku,
        movement.item.nameAr,
        movement.item.unit,
        n(movement.quantity),
        movement.technician
          ?.name || "",
        movement.order?.orderNo ||
          "",
        movement.purchaseReceipt
          ?.receiptNo || "",
        movement.stocktake
          ?.stocktakeNo || "",
        parsed.note,
      ];
    });

  return [
    {
      name: "أرصدة المخزون",
      headers,
      rows: inventoryRows,
    },
    {
      name: "عهد الفنيين",
      headers: [
        "الفني",
        "حالة الفني",
        "الكود",
        "الصنف",
        "الوحدة",
        "الكمية",
      ],
      rows: custodyRows,
    },
    {
      name: "حركة المخزون",
      headers: [
        "التاريخ",
        "النوع",
        "التصنيف",
        "الكود",
        "الصنف",
        "الوحدة",
        "الكمية",
        "الفني",
        "الأوردر",
        "التوريد",
        "الجرد",
        "الملاحظة",
      ],
      rows: movementRows,
    },
  ];
}

async function stocktakeSheets(): Promise<
  ExcelSheet[]
> {
  const stocktakes =
    await prisma.stocktake.findMany({
      include: {
        technician: {
          select: { name: true },
        },
        createdBy: {
          select: { name: true },
        },
        approvedBy: {
          select: { name: true },
        },
        lines: {
          include: {
            item: {
              select: {
                sku: true,
                nameAr: true,
                unit: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  return [
    {
      name: "ملخص الجرد",
      headers: [
        "رقم الجرد",
        "الحالة",
        "الموقع",
        "الفني",
        "أنشأه",
        "اعتمده",
        "تاريخ الإنشاء",
        "تاريخ الاعتماد",
        "عدد الأصناف",
        "عدد الفروقات",
      ],
      rows: stocktakes.map(
        (stocktake) => [
          stocktake.stocktakeNo,
          stocktake.status,
          stocktake.locationType ===
          "COMPANY"
            ? "مخزن الشركة"
            : "عهدة فني",
          stocktake.technician
            ?.name || "",
          stocktake.createdBy
            ?.name || "",
          stocktake.approvedBy
            ?.name || "",
          stocktake.createdAt,
          stocktake.approvedAt ||
            "",
          stocktake.lines.length,
          stocktake.lines.filter(
            (line) =>
              line.difference != null &&
              Math.abs(
                n(line.difference),
              ) > 0.000001,
          ).length,
        ],
      ),
    },
    {
      name: "تفاصيل الجرد",
      headers: [
        "رقم الجرد",
        "الموقع",
        "الفني",
        "الكود",
        "الصنف",
        "الوحدة",
        "المتوقع",
        "الفعلي",
        "الفرق",
        "الملاحظة",
      ],
      rows: stocktakes.flatMap(
        (stocktake) =>
          stocktake.lines.map(
            (line) => [
              stocktake.stocktakeNo,
              stocktake.locationType ===
              "COMPANY"
                ? "مخزن الشركة"
                : "عهدة فني",
              stocktake.technician
                ?.name || "",
              line.item.sku,
              line.item.nameAr,
              line.item.unit,
              n(line.expectedQty),
              line.actualQty == null
                ? ""
                : n(line.actualQty),
              line.difference == null
                ? ""
                : n(line.difference),
              line.note || "",
            ],
          ),
      ),
    },
  ];
}

async function purchaseSheets(
  canViewCost: boolean,
): Promise<ExcelSheet[]> {
  const receipts =
    await prisma.purchaseReceipt.findMany({
      include: {
        supplier: true,
        receivedBy: {
          select: { name: true },
        },
        items: {
          include: {
            item: {
              select: {
                sku: true,
                nameAr: true,
                unit: true,
              },
            },
          },
        },
      },
      orderBy: {
        receivedAt: "desc",
      },
    });

  const summaryHeaders = [
    "رقم التوريد",
    "المورد",
    "فاتورة المورد",
    "الحالة",
    "تاريخ الاستلام",
    "المستلم",
    "عدد البنود",
  ];

  if (canViewCost) {
    summaryHeaders.push(
      "إجمالي التكلفة",
    );
  }

  return [
    {
      name: "المشتريات",
      headers: summaryHeaders,
      rows: receipts.map((receipt) => {
        const row: any[] = [
          receipt.receiptNo,
          receipt.supplier.name,
          receipt.supplierInvoiceNo ||
            "",
          receipt.status,
          receipt.receivedAt,
          receipt.receivedBy?.name ||
            "",
          receipt.items.length,
        ];
        if (canViewCost)
          row.push(n(receipt.total));
        return row;
      }),
    },
    {
      name: "بنود المشتريات",
      headers: [
        "رقم التوريد",
        "المورد",
        "الكود",
        "الصنف",
        "الوحدة",
        "الكمية",
        ...(canViewCost
          ? [
              "تكلفة الوحدة",
              "إجمالي البند",
            ]
          : []),
      ],
      rows: receipts.flatMap(
        (receipt) =>
          receipt.items.map(
            (line) => {
              const row: any[] = [
                receipt.receiptNo,
                receipt.supplier.name,
                line.item.sku,
                line.item.nameAr,
                line.item.unit,
                n(line.quantity),
              ];
              if (canViewCost) {
                row.push(
                  n(line.unitCost),
                  n(line.lineTotal),
                );
              }
              return row;
            },
          ),
      ),
    },
  ];
}

async function accountingSheets(): Promise<
  ExcelSheet[]
> {
  const [invoices, payments] =
    await Promise.all([
      prisma.invoice.findMany({
        include: {
          order: {
            include: {
              customer: true,
            },
          },
        },
        orderBy: {
          issuedAt: "desc",
        },
      }),
      prisma.payment.findMany({
        include: {
          order: {
            select: {
              orderNo: true,
              customer: {
                select: {
                  name: true,
                },
              },
            },
          },
          receivedBy: {
            select: { name: true },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

  return [
    {
      name: "الفواتير",
      headers: [
        "رقم الفاتورة",
        "رقم الطلب",
        "العميل",
        "الإجمالي",
        "المدفوع",
        "المتبقي",
        "تاريخ الإصدار",
      ],
      rows: invoices.map(
        (invoice) => [
          invoice.invoiceNo,
          invoice.order.orderNo,
          invoice.order.customer.name,
          n(invoice.total),
          n(invoice.paid),
          n(invoice.due),
          invoice.issuedAt,
        ],
      ),
    },
    {
      name: "المدفوعات",
      headers: [
        "التاريخ",
        "رقم الطلب",
        "العميل",
        "المبلغ",
        "الطريقة",
        "المرجع",
        "المستلم",
      ],
      rows: payments.map(
        (payment) => [
          payment.createdAt,
          payment.order.orderNo,
          payment.order.customer.name,
          n(payment.amount),
          payment.method,
          payment.reference || "",
          payment.receivedBy?.name ||
            "",
        ],
      ),
    },
  ];
}

export async function GET(
  req: Request,
) {
  try {
    const actor =
      await requirePermission(
        PERMISSIONS.EXPORTS_VIEW,
      );
    const type =
      new URL(req.url).searchParams.get(
        "type",
      ) || "all";

    const canViewCost = can(
      actor.role,
      PERMISSIONS.INVENTORY_COST_VIEW,
      actor.permissions,
    );

    let sheets: ExcelSheet[] = [];

    if (
      type === "inventory" ||
      type === "all"
    ) {
      sheets.push(
        ...(await inventorySheets(
          canViewCost,
        )),
      );
    }

    if (
      type === "stocktakes" ||
      type === "all"
    ) {
      sheets.push(
        ...(await stocktakeSheets()),
      );
    }

    if (
      type === "purchases" ||
      type === "all"
    ) {
      sheets.push(
        ...(await purchaseSheets(
          canViewCost,
        )),
      );
    }

    if (
      type === "accounting" ||
      type === "all"
    ) {
      sheets.push(
        ...(await accountingSheets()),
      );
    }

    if (!sheets.length) {
      return new Response(
        "نوع التقرير غير صالح",
        { status: 400 },
      );
    }

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel: actor.name,
        action:
          "EXCEL_EXPORT_DOWNLOADED",
        newValue: {
          type,
          sheetCount:
            sheets.length,
        },
      },
    });

    const workbook =
      buildExcelXmlWorkbook(sheets);
    const date = new Date()
      .toISOString()
      .slice(0, 10);

    return excelResponse(
      workbook,
      `Ventic-Pro-${type}-${date}.xls`,
    );
  } catch (error: any) {
    return new Response(
      error?.message ||
        "تعذر تصدير التقرير",
      {
        status:
          error?.message ===
          "UNAUTHENTICATED"
            ? 401
            : error?.message ===
                "FORBIDDEN"
              ? 403
              : 500,
      },
    );
  }
}
