"use client";

import { useEffect, useState } from "react";

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "مدير النظام",
  ADMIN: "مدير",
  CUSTOMER_SERVICE: "خدمة العملاء",
  TECHNICIAN: "فني",
};

type Me = {
  id: string;
  name: string;
  login: string;
  role: string;
};

export default function AccountMenu() {
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((data) => {
        if (data?.user) setMe(data.user);
      })
      .catch(() => undefined);
  }, []);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  if (!me) return null;

  return (
    <div
      dir="rtl"
      style={{
        position: "fixed",
        top: 14,
        left: 72,
        zIndex: 2100,
        fontFamily: "inherit",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        title="الحساب الحالي"
        aria-label="الحساب الحالي"
        style={{
          minHeight: 46,
          display: "flex",
          alignItems: "center",
          gap: 9,
          border: "1px solid #dbe3ea",
          borderRadius: 14,
          background: "white",
          padding: "7px 10px",
          boxShadow: "0 8px 24px rgba(15,23,42,.14)",
          cursor: "pointer",
          color: "#0f2d4a",
        }}
      >
        <span style={{ fontSize: 20 }}>👤</span>

        <span style={{ textAlign: "right", lineHeight: 1.2 }}>
          <strong style={{ display: "block", fontSize: 13 }}>
            {me.name}
          </strong>
          <small style={{ color: "#64748b", fontSize: 11 }}>
            {roleLabels[me.role] || me.role}
          </small>
        </span>

        <span style={{ color: "#94a3b8", fontSize: 11 }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: 54,
            left: 0,
            width: 270,
            background: "white",
            border: "1px solid #dbe3ea",
            borderRadius: 14,
            boxShadow: "0 18px 45px rgba(15,23,42,.18)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: 14,
              borderBottom: "1px solid #edf2f7",
            }}
          >
            <strong style={{ display: "block", color: "#0f2d4a" }}>
              {me.name}
            </strong>
            <small
              style={{
                display: "block",
                color: "#64748b",
                marginTop: 4,
              }}
            >
              {me.login}
            </small>
            <small
              style={{
                display: "block",
                color: "#64748b",
                marginTop: 3,
              }}
            >
              {roleLabels[me.role] || me.role}
            </small>
          </div>

          <button
            type="button"
            onClick={() => void logout()}
            disabled={loggingOut}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              border: 0,
              background: "#fff",
              color: "#b91c1c",
              padding: 13,
              cursor: loggingOut ? "wait" : "pointer",
              fontWeight: 800,
            }}
          >
            <span>↪</span>
            {loggingOut
              ? "جاري تسجيل الخروج..."
              : "تسجيل الخروج"}
          </button>
        </div>
      )}
    </div>
  );
}
