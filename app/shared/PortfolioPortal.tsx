"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PortfolioGallery from "@/app/shared/PortfolioGallery";

function HeaderWorksLinkPortal() {
  const [target, setTarget] =
    useState<HTMLElement | null>(null);

  useEffect(() => {
    const header = document.querySelector("main > header");
    if (!header) return;

    const actionGroups = Array.from(
      header.querySelectorAll(":scope > div"),
    );

    const actionGroup = actionGroups.find((element) =>
      element.querySelector('a[href="/customer"]'),
    ) as HTMLElement | undefined;

    if (actionGroup) {
      setTarget(actionGroup);
    }
  }, []);

  if (!target) return null;

  return createPortal(
    <Link className="outline" href="/works">
      أعمالنا
    </Link>,
    target,
  );
}

export default function PortfolioPortal() {
  const pathname = usePathname();

  if (pathname === "/") {
    return (
      <>
        <HeaderWorksLinkPortal />
        <PortfolioGallery limit={4} showAllLink />
      </>
    );
  }

  return null;
}
