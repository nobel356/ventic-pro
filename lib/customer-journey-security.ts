export function customerActiveOrderWhere(
  customerId: string,
  orderId: string,
  extra: Record<string, unknown> = {},
) {
  return {
    id: orderId,
    customerId,
    archivedAt: null,
    ...extra,
  };
}

export function technicianActiveOrderWhere(
  technicianId: string,
  orderId: string,
  extra: Record<string, unknown> = {},
) {
  return {
    id: orderId,
    technicianId,
    archivedAt: null,
    ...extra,
  };
}

export function customerDeviceForOrderWhere(
  customerId: string,
  order: {
    id: string;
    propertyId: string | null;
  },
  deviceId: string,
) {
  return {
    id: deviceId,
    active: true,
    propertyId:
      order.propertyId ||
      "__NO_PROPERTY__",
    property: {
      customerId,
    },
    OR: [
      {
        sourceOrderId: null,
      },
      {
        sourceOrderId:
          order.id,
      },
    ],
  };
}
