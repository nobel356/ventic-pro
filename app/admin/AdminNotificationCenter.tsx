"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string | null;
  isRead: boolean;
  createdAt: string;
  orderId: string | null;
};

type ApiResponse = {
  items: NotificationItem[];
  unread: number;
  staleMinutes?: number;
};

type FilterKey =
  | "ALL"
  | "UNREAD"
  | "ORDERS"
  | "PAYMENTS"
  | "QUOTATIONS"
  | "AFTERCARE";

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: "ALL", label: "الكل" },
  { key: "UNREAD", label: "غير مقروء" },
  { key: "ORDERS", label: "الطلبات" },
  { key: "PAYMENTS", label: "المدفوعات" },
  { key: "QUOTATIONS", label: "المقايسات" },
  { key: "AFTERCARE", label: "ما بعد البيع" },
];

function categoryMatches(item: NotificationItem, filter: FilterKey) {
  if (filter === "ALL") return true;
  if (filter === "UNREAD") return !item.isRead;
  if (filter === "PAYMENTS") return item.type === "PAYMENT";
  if (filter === "QUOTATIONS") {
    return ["QUOTATION_RESPONSE", "EXTRA_CHARGE_RESPONSE"].includes(item.type);
  }
  if (filter === "AFTERCARE") {
    return ["MAINTENANCE_REQUEST", "COMPLAINT"].includes(item.type);
  }
  return [
    "NEW_ORDER",
    "ORDER_STATUS",
    "TECHNICIAN_ASSIGNMENT",
    "ORDER_COMPLETED",
    "OTP_ALERT",
    "ORDER_STALE",
  ].includes(item.type);
}

function iconFor(type: string) {
  const map: Record<string, string> = {
    NEW_ORDER: "🛎️",
    ORDER_STATUS: "🔄",
    TECHNICIAN_ASSIGNMENT: "👷",
    ORDER_COMPLETED: "✅",
    PAYMENT: "💳",
    QUOTATION_RESPONSE: "📋",
    EXTRA_CHARGE_RESPONSE: "🧾",
    MAINTENANCE_REQUEST: "🛠️",
    COMPLAINT: "⚠️",
    OTP_ALERT: "🔐",
    ORDER_STALE: "⏰",
    SYSTEM: "ℹ️",
  };
  return map[type] || "🔔";
}

function accentFor(type: string) {
  if (["COMPLAINT", "OTP_ALERT"].includes(type)) return "#dc2626";
  if (type === "ORDER_STALE") return "#d97706";
  if (type === "PAYMENT") return "#15803d";
  if (["QUOTATION_RESPONSE", "EXTRA_CHARGE_RESPONSE"].includes(type)) {
    return "#7c3aed";
  }
  if (type === "MAINTENANCE_REQUEST") return "#0369a1";
  if (type === "ORDER_COMPLETED") return "#15803d";
  return "#f97316";
}

export default function AdminNotificationCenter() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported",
  );
  const initialLoad = useRef(true);
  const latestSeenId = useRef<string | null>(null);

  async function loadNotifications() {
    try {
      const response = await fetch("/api/admin/notifications?take=60", {
        cache: "no-store",
      });
      if (!response.ok) return;

      const data = (await response.json()) as ApiResponse;
      const newest = data.items[0];

      if (
        !initialLoad.current &&
        newest &&
        newest.id !== latestSeenId.current &&
        !newest.isRead &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        window.Notification.permission === "granted"
      ) {
        const browserNotification = new window.Notification(
          `${iconFor(newest.type)} ${newest.title}`,
          {
            body: newest.message,
            tag: newest.id,
          },
        );

        browserNotification.onclick = () => {
          window.focus();
          if (newest.href) window.location.href = newest.href;
          browserNotification.close();
        };
      }

      latestSeenId.current = newest?.id || latestSeenId.current;
      initialLoad.current = false;
      setItems(data.items || []);
      setUnread(data.unread || 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(window.Notification.permission);
    }

    void loadNotifications();
    const timer = window.setInterval(() => void loadNotifications(), 15000);
    return () => window.clearInterval(timer);
  }, []);

  async function requestBrowserPermission() {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    const result = await window.Notification.requestPermission();
    setPermission(result);
  }

  async function markRead(item: NotificationItem) {
    if (!item.isRead) {
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, isRead: true } : entry,
        ),
      );
      setUnread((value) => Math.max(0, value - 1));
    }

    setOpen(false);
    if (item.href) router.push(item.href);
  }

  async function markAllRead() {
    await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setItems((current) => current.map((item) => ({ ...item, isRead: true })));
    setUnread(0);
  }

  const visibleItems = items.filter((item) => categoryMatches(item, filter));

  return (
    <div
      dir="rtl"
      style={{
        position: "fixed",
        top: 14,
        left: 14,
        zIndex: 2000,
        fontFamily: "inherit",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="مركز الإشعارات"
        title="مركز الإشعارات"
        style={{
          position: "relative",
          width: 46,
          height: 46,
          borderRadius: 14,
          border: "1px solid #dbe3ea",
          background: "#fff",
          boxShadow: "0 8px 24px rgba(15, 23, 42, .14)",
          cursor: "pointer",
          fontSize: 22,
        }}
      >
        🔔
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: -7,
              right: -7,
              minWidth: 22,
              height: 22,
              padding: "0 6px",
              borderRadius: 999,
              background: "#f97316",
              color: "white",
              fontSize: 12,
              lineHeight: "22px",
              fontWeight: 800,
              border: "2px solid white",
            }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: 54,
            left: 0,
            width: "min(430px, calc(100vw - 28px))",
            maxHeight: "78vh",
            overflow: "hidden",
            borderRadius: 16,
            border: "1px solid #dbe3ea",
            background: "white",
            boxShadow: "0 18px 45px rgba(15, 23, 42, .2)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "14px 16px",
              borderBottom: "1px solid #edf2f7",
            }}
          >
            <div>
              <strong style={{ color: "#0f2d4a" }}>مركز الإشعارات</strong>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                {unread ? `${unread} غير مقروء` : "لا توجد إشعارات جديدة"}
              </div>
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                style={{
                  border: 0,
                  background: "transparent",
                  color: "#0f5f95",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                قراءة الكل
              </button>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 6,
              overflowX: "auto",
              padding: "10px 12px",
              borderBottom: "1px solid #edf2f7",
              background: "#f8fafc",
            }}
          >
            {filters.map((entry) => (
              <button
                type="button"
                key={entry.key}
                onClick={() => setFilter(entry.key)}
                style={{
                  border: filter === entry.key ? "1px solid #0f5f95" : "1px solid #dbe3ea",
                  borderRadius: 999,
                  padding: "6px 10px",
                  background: filter === entry.key ? "#e0f2fe" : "white",
                  color: filter === entry.key ? "#0f5f95" : "#475569",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {entry.label}
              </button>
            ))}
          </div>

          {permission === "default" && (
            <div
              style={{
                padding: 12,
                background: "#f8fafc",
                borderBottom: "1px solid #edf2f7",
              }}
            >
              <button
                type="button"
                onClick={() => void requestBrowserPermission()}
                style={{
                  width: "100%",
                  border: 0,
                  borderRadius: 10,
                  padding: "10px 12px",
                  background: "#0f2d4a",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                تفعيل إشعارات الجهاز
              </button>
            </div>
          )}

          <div style={{ maxHeight: "56vh", overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
                جاري تحميل الإشعارات...
              </div>
            ) : visibleItems.length === 0 ? (
              <div style={{ padding: 28, textAlign: "center", color: "#64748b" }}>
                لا توجد إشعارات في هذا القسم.
              </div>
            ) : (
              visibleItems.map((item) => {
                const accent = accentFor(item.type);
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => void markRead(item)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "right",
                      border: 0,
                      borderBottom: "1px solid #edf2f7",
                      borderRight: `4px solid ${accent}`,
                      padding: "13px 15px",
                      background: item.isRead ? "white" : "#fffaf5",
                      cursor: item.href ? "pointer" : "default",
                    }}
                  >
                    <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
                      <span style={{ fontSize: 19 }}>{iconFor(item.type)}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                          {!item.isRead && (
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 999,
                                background: accent,
                                flex: "0 0 auto",
                              }}
                            />
                          )}
                          <strong style={{ color: "#0f2d4a", fontSize: 14 }}>
                            {item.title}
                          </strong>
                        </div>
                        <div
                          style={{
                            color: "#475569",
                            fontSize: 13,
                            marginTop: 5,
                            lineHeight: 1.6,
                          }}
                        >
                          {item.message}
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 6 }}>
                          {new Date(item.createdAt).toLocaleString("ar-EG")}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
