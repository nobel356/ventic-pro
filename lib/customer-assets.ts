function clean(value: unknown) {
  return String(value || "").trim();
}

export function deviceTypeFromService(code: string, name: string) {
  const token = `${code} ${name}`.toUpperCase();

  if (token.includes("DUCT")) return null;
  if (token.includes("HOOD")) return "هود";
  if (token.includes("EXTERNAL")) return "مروحة طرد خارجية";
  if (token.includes("KITCHEN")) return "بلاور مطبخ";
  if (token.includes("BATH")) return "بلاور حمام";

  if (/هود/.test(name)) return "هود";
  if (/مروحة طرد خارجية/.test(name)) return "مروحة طرد خارجية";
  if (/بلاور مطبخ/.test(name)) return "بلاور مطبخ";
  if (/بلاور حمام/.test(name)) return "بلاور حمام";

  return null;
}

export async function ensureOrderProperty(
  client: any,
  orderId: string,
) {
  const order = await client.order.findUnique({
    where: { id: orderId },
  });

  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.propertyId) return order.propertyId;

  const governorate = clean(order.governorate) || "غير محدد";
  const area = clean(order.area) || "غير محدد";
  const address = clean(order.address) || "العنوان غير مسجل";

  let property = await client.property.findFirst({
    where: {
      customerId: order.customerId,
      governorate,
      area,
      address,
    },
    orderBy: { createdAt: "asc" },
  });

  if (!property) {
    const count = await client.property.count({
      where: { customerId: order.customerId },
    });

    property = await client.property.create({
      data: {
        customerId: order.customerId,
        label: count === 0 ? "العنوان الرئيسي" : `عقار ${count + 1}`,
        governorate,
        area,
        address,
      },
    });
  }

  await client.order.update({
    where: { id: orderId },
    data: { propertyId: property.id },
  });

  return property.id;
}

export async function createInstalledDevicesFromOrder(
  client: any,
  input: {
    orderId: string;
    propertyId: string;
    installedAt: Date;
    warrantyEndsAt: Date;
  },
) {
  const existing = await client.device.count({
    where: { sourceOrderId: input.orderId },
  });

  if (existing > 0) {
    return { created: 0, existing };
  }

  const order = await client.order.findUnique({
    where: { id: input.orderId },
    include: {
      spaces: {
        include: {
          services: true,
        },
      },
    },
  });

  if (!order) throw new Error("ORDER_NOT_FOUND");

  const devices: Array<{
    propertyId: string;
    sourceOrderId: string;
    type: string;
    serviceCode: string;
    serviceName: string;
    size: string | null;
    location: string | null;
    installedAt: Date;
    warrantyEndsAt: Date;
    notes: string;
  }> = [];

  for (const space of order.spaces) {
    const details =
      space.details && typeof space.details === "object"
        ? (space.details as Record<string, unknown>)
        : {};

    for (const service of space.services) {
      const type = deviceTypeFromService(
        service.serviceCodeSnapshot,
        service.serviceNameSnapshot,
      );

      if (!type) continue;

      const size =
        clean(details.size) ||
        clean(details.width) ||
        clean(details.hoodWidth) ||
        null;

      const location =
        clean(details.location) ||
        clean(details.exitLocation) ||
        space.label ||
        null;

      devices.push({
        propertyId: input.propertyId,
        sourceOrderId: input.orderId,
        type,
        serviceCode: service.serviceCodeSnapshot,
        serviceName: service.serviceNameSnapshot,
        size,
        location,
        installedAt: input.installedAt,
        warrantyEndsAt: input.warrantyEndsAt,
        notes: `تم إنشاؤه تلقائيًا من الطلب ${order.orderNo}`,
      });
    }
  }

  if (devices.length === 0) {
    return { created: 0, existing: 0 };
  }

  const result = await client.device.createMany({
    data: devices,
  });

  return { created: result.count, existing: 0 };
}
