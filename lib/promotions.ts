type CouponLike = {
  code: string;
  type: "FIXED" | "PERCENT";
  value: unknown;
  minOrder: unknown;
  startsAt: Date | null;
  endsAt: Date | null;
  maxUses: number | null;
  usedCount: number;
  eligibleServiceCodes: string[];
  active: boolean;
};

export function couponDiscount(input: {
  coupon: CouponLike | null;
  subtotal: number;
  serviceCodes: string[];
  now?: Date;
}) {
  const { coupon, subtotal, serviceCodes } = input;
  const now = input.now || new Date();

  if (!coupon || !coupon.active) {
    return {
      valid: false,
      discount: 0,
      reason: "الكوبون غير صالح أو غير متاح",
    };
  }

  if (coupon.startsAt && coupon.startsAt > now) {
    return {
      valid: false,
      discount: 0,
      reason: "الكوبون لم يبدأ بعد",
    };
  }

  if (coupon.endsAt && coupon.endsAt < now) {
    return {
      valid: false,
      discount: 0,
      reason: "انتهت صلاحية الكوبون",
    };
  }

  if (
    coupon.maxUses != null &&
    coupon.usedCount >= coupon.maxUses
  ) {
    return {
      valid: false,
      discount: 0,
      reason: "تم الوصول للحد الأقصى لاستخدام الكوبون",
    };
  }

  const minOrder = Number(coupon.minOrder || 0);
  if (subtotal < minOrder) {
    return {
      valid: false,
      discount: 0,
      reason: `الحد الأدنى للطلب ${minOrder.toLocaleString("ar-EG")} ج`,
    };
  }

  if (coupon.eligibleServiceCodes.length > 0) {
    const allowed = new Set(
      coupon.eligibleServiceCodes.map((code) => code.toUpperCase()),
    );
    const hasEligibleService = serviceCodes.some((code) =>
      allowed.has(code.toUpperCase()),
    );

    if (!hasEligibleService) {
      return {
        valid: false,
        discount: 0,
        reason: "الكوبون غير متاح للخدمات المختارة",
      };
    }
  }

  const raw =
    coupon.type === "PERCENT"
      ? subtotal * (Number(coupon.value || 0) / 100)
      : Number(coupon.value || 0);

  const discount = Math.max(
    0,
    Math.min(subtotal, Math.round(raw * 100) / 100),
  );

  return {
    valid: discount > 0,
    discount,
    reason: discount > 0 ? null : "قيمة الخصم غير صالحة",
  };
}

export async function calculateOrderOffer(
  client: any,
  input: {
    governorate?: string | null;
    area?: string | null;
    couponCode?: string | null;
    subtotal: number;
    serviceCodes: string[];
  },
) {
  const governorate = String(input.governorate || "").trim();
  const area = String(input.area || "").trim();
  const couponCode = String(input.couponCode || "")
    .trim()
    .toUpperCase();

  const serviceArea =
    governorate && area
      ? await client.serviceArea.findUnique({
          where: {
            governorate_area: {
              governorate,
              area,
            },
          },
        })
      : null;

  const travelFee =
    serviceArea && serviceArea.active
      ? Number(serviceArea.travelFee || 0)
      : 0;

  const coupon = couponCode
    ? await client.coupon.findUnique({
        where: { code: couponCode },
      })
    : null;

  const couponResult = couponDiscount({
    coupon,
    subtotal: input.subtotal + travelFee,
    serviceCodes: input.serviceCodes,
  });

  const discount =
    couponCode && couponResult.valid
      ? couponResult.discount
      : 0;

  return {
    serviceArea,
    travelFee,
    coupon,
    couponValid: couponCode ? couponResult.valid : false,
    couponReason: couponCode ? couponResult.reason : null,
    discount,
    total: Math.max(
      0,
      Math.round(
        (input.subtotal + travelFee - discount) * 100,
      ) / 100,
    ),
  };
}
