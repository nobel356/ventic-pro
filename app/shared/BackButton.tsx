"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const STORAGE_KEY = "ventic_navigation_stack";
const MAX_HISTORY = 30;

function readStack() {
  if (typeof window === "undefined") return [] as string[];

  try {
    const parsed = JSON.parse(
      window.sessionStorage.getItem(STORAGE_KEY) || "[]",
    );

    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function saveStack(stack: string[]) {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(stack.slice(-MAX_HISTORY)),
  );
}

export default function BackButton({
  fallbackHref,
}: {
  fallbackHref: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const stack = readStack();
    const last = stack[stack.length - 1];

    if (last === pathname) return;

    const previous = stack[stack.length - 2];

    if (previous === pathname) {
      stack.pop();
    } else {
      stack.push(pathname);
    }

    saveStack(stack);
  }, [pathname]);

  function goBack() {
    const stack = readStack();

    if (stack[stack.length - 1] === pathname) {
      stack.pop();
    }

    const target = stack[stack.length - 1];

    if (target && target !== pathname) {
      saveStack(stack);
      router.push(target);
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="الرجوع للصفحة السابقة"
      title="رجوع"
      style={{
        position: "fixed",
        left: 18,
        bottom: 18,
        zIndex: 2400,
        minWidth: 50,
        height: 46,
        border: "1px solid #d7e0e8",
        borderRadius: 14,
        background: "#ffffff",
        color: "#0f2d4a",
        boxShadow: "0 10px 28px rgba(15,23,42,.16)",
        padding: "0 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        cursor: "pointer",
        fontWeight: 900,
        fontFamily: "inherit",
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 20 }}>
        ←
      </span>
      <span>رجوع</span>
    </button>
  );
}
