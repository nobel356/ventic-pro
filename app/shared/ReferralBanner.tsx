"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Referral = {
  code: string;
  discountType: "FIXED" | "PERCENT";
  discountValue: number;
};

export default function ReferralBanner() {
  const pathname = usePathname();
  const [referral, setReferral] = useState<Referral | null>(null);

  useEffect(() => {
    if (!pathname.startsWith("/order")) return;

    let active = true;

    fetch("/api/referral/status", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { referral: null }))
      .then((data) => {
        if (active) setReferral(data?.referral || null);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [pathname]);

  if (!pathname.startsWith("/order") || !referral) return null;

  return (
    <div
      dir="rtl"
      style={{
        position: "fixed",
        top: "max(66px, calc(env(safe-area-inset-top) + 58px))",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 2500,
        width: "min(620px,calc(100% - 28px))",
        border: "1px solid #bbf7d0",
        borderRadius: 13,
        padding: "10px 13px",
        background: "rgba(240,253,244,.97)",
        color: "#166534",
        boxShadow: "0 10px 28px rgba(7,26,43,.12)",
        textAlign: "center",
        fontSize: 13,
        fontWeight: 900,
        backdropFilter: "blur(10px)",
      }}
    >
      ✓ كود الإحالة {referral.code} فعال — خصمك {referral.discountValue}
      {referral.discountType === "PERCENT" ? "%" : " جنيه"} يُطبق عند إنشاء الطلب.
      لا يجتمع مع كوبون خصم آخر.
    </div>
  );
}
