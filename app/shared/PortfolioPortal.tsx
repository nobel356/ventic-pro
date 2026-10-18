"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import PortfolioGallery from "@/app/shared/PortfolioGallery";

export default function PortfolioPortal() {
  const pathname = usePathname();

  if (pathname === "/") {
    return <PortfolioGallery limit={4} showAllLink />;
  }

  if (
    pathname.startsWith("/admin") &&
    pathname !== "/admin/portfolio-videos"
  ) {
    return (
      <Link
        href="/admin/portfolio-videos"
        style={{
          position: "fixed",
          left: 18,
          bottom: "max(18px, calc(env(safe-area-inset-bottom) + 10px))",
          zIndex: 1450,
          borderRadius: 999,
          background: "#0b2f49",
          color: "white",
          textDecoration: "none",
          padding: "11px 15px",
          fontWeight: 900,
          fontSize: 13,
          boxShadow: "0 12px 30px rgba(7,26,43,.22)",
          border: "1px solid rgba(255,255,255,.18)",
        }}
      >
        🎬 فيديوهات الأعمال
      </Link>
    );
  }

  return null;
}
