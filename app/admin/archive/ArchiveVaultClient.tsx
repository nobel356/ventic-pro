"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type StatusData = {
  configured: boolean;
  unlocked: boolean;
  isSuperAdmin: boolean;
  canView: boolean;
  canArchive: boolean;
  canRestore: boolean;
};

type ArchivedOrder = {
  id: string;
  orderNo: string;
  status: string;
  estimatedTotal: string | number | null;
  finalTotal: string | number | null;
  archivedAt: string;
  archivedByLabel: string | null;
  archiveReason: string | null;
  customer: {
    name: string;
    phone: string;
  };
};

type ArchivedUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  active: boolean;
  archivedAt: string;
  archivedByLabel: string | null;
  archiveReason: string | null;
};

type ArchiveLog = {
  id: string;
  orderId: string | null;
  actorId: string | null;
  actorLabel: string;
  action: string;
  createdAt: string;
};

type ItemsData = {
  orders: ArchivedOrder[];
  users: ArchivedUser[];
  logs: ArchiveLog[];
};

const actionLabels: Record<string, string> = {
  ARCHIVE_ORDER: "أرشفة طلب",
  ARCHIVE_ORDER_RESTORED: "استرجاع طلب",
  ARCHIVE_USER: "أرشفة مستخدم",
  ARCHIVE_USER_RESTORED: "استرجاع مستخدم",
  ARCHIVE_VAULT_UNLOCKED: "فتح الخزنة",
  ARCHIVE_VAULT_UNLOCK_FAILED: "محاولة فتح فاشلة",
  ARCHIVE_VAULT_UNLOCK_RATE_LIMITED: "محاولات فتح كثيرة",
  ARCHIVE_VAULT_LOCKED: "قفل الخزنة",
  ARCHIVE_VAULT_PASSWORD_SET: "إعداد كلمة سر الخزنة",
  ARCHIVE_VAULT_PASSWORD_CHANGED: "تغيير كلمة سر الخزنة",
};

function cairoDate(value: string) {
  return new Date(value).toLocaleString("ar-EG", {
    timeZone: "Africa/Cairo",
  });
}

function money(value: unknown) {
  return Number(value || 0).toLocaleString("ar-EG", {
    maximumFractionDigits: 2,
  });
}

export default function ArchiveVaultClient() {
  const [status, setStatus] =
    useState<StatusData | null>(null);
  const [items, setItems] =
    useState<ItemsData | null>(null);
  const [password, setPassword] =
    useState("");
  const [newPassword, setNewPassword] =
    useState("");
  const [loading, setLoading] =
    useState(true);
  const [busy, setBusy] =
    useState(false);
  const [error, setError] =
    useState("");
  const [message, setMessage] =
    useState("");
  const [tab, setTab] =
    useState<"orders" | "users" | "logs">("orders");
  const [search, setSearch] =
    useState("");

  async function loadStatus() {
    const response =
      await fetch(
        "/api/admin/archive/status",
        { cache: "no-store" },
      );
    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error ||
          "تعذر تحميل حالة الأرشيف.",
      );
    }

    setStatus(data);
    return data as StatusData;
  }

  async function loadItems() {
    const response =
      await fetch(
        "/api/admin/archive/items",
        { cache: "no-store" },
      );
    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error ||
          "تعذر تحميل العناصر المؤرشفة.",
      );
    }

    setItems(data);
  }

  async function refresh() {
    setLoading(true);
    setError("");

    try {
      const nextStatus =
        await loadStatus();

      if (
        nextStatus.configured &&
        nextStatus.unlocked
      ) {
        await loadItems();
      } else {
        setItems(null);
      }
    } catch (err: any) {
      setError(
        err?.message ||
          "حدث خطأ.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function unlock() {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/archive/unlock",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              password,
            }),
          },
        );
      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر فتح الأرشيف.",
        );
      }

      setPassword("");
      setMessage(
        "تم فتح Archive Vault.",
      );
      await refresh();
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر فتح الأرشيف.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function savePassword() {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/archive/password",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              password:
                newPassword,
            }),
          },
        );
      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر حفظ كلمة السر.",
        );
      }

      setNewPassword("");
      setMessage(
        status?.configured
          ? "تم تغيير كلمة سر الأرشيف."
          : "تم إعداد كلمة سر الأرشيف وفتح الخزنة.",
      );
      await refresh();
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر حفظ كلمة السر.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function lockVault() {
    setBusy(true);
    setError("");

    try {
      await fetch(
        "/api/admin/archive/lock",
        { method: "POST" },
      );
      setItems(null);
      setMessage(
        "تم قفل Archive Vault.",
      );
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function restore(
    type: "orders" | "users",
    id: string,
    label: string,
  ) {
    if (
      !window.confirm(
        `استرجاع ${label} إلى النظام؟`,
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response =
        await fetch(
          `/api/admin/archive/${type}/${id}`,
          {
            method: "POST",
          },
        );
      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر الاسترجاع.",
        );
      }

      setMessage(
        `تم استرجاع ${label}.`,
      );
      await loadItems();
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر الاسترجاع.",
      );
    } finally {
      setBusy(false);
    }
  }

  const visibleOrders =
    useMemo(() => {
      const q =
        search
          .trim()
          .toLowerCase();

      if (!q) {
        return (
          items?.orders || []
        );
      }

      return (
        items?.orders || []
      ).filter((order) =>
        [
          order.orderNo,
          order.customer.name,
          order.customer.phone,
          order.archiveReason,
          order.archivedByLabel,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }, [items, search]);

  const visibleUsers =
    useMemo(() => {
      const q =
        search
          .trim()
          .toLowerCase();

      if (!q) {
        return (
          items?.users || []
        );
      }

      return (
        items?.users || []
      ).filter((user) =>
        [
          user.name,
          user.email,
          user.phone,
          user.role,
          user.archiveReason,
          user.archivedByLabel,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }, [items, search]);

  if (loading) {
    return (
      <div style={cardStyle}>
        جاري تحميل الأرشيف...
      </div>
    );
  }

  if (!status) {
    return (
      <div style={errorStyle}>
        تعذر تحميل حالة الأرشيف.
      </div>
    );
  }

  if (!status.configured) {
    return (
      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>
          إعداد Archive Vault
        </h2>

        {status.isSuperAdmin ? (
          <>
            <p style={mutedStyle}>
              أول مرة فقط: حدد كلمة سر إضافية للخزنة. لا يتم حفظ الكلمة نفسها، بل Hash فقط.
            </p>

            <input
              type="password"
              value={newPassword}
              onChange={(event) =>
                setNewPassword(
                  event.target.value,
                )
              }
              placeholder="10 أحرف على الأقل"
              autoComplete="new-password"
              style={inputStyle}
            />

            <button
              type="button"
              disabled={
                busy ||
                newPassword.length <
                  10
              }
              onClick={() =>
                void savePassword()
              }
              style={primaryButtonStyle}
            >
              {busy
                ? "جاري الحفظ..."
                : "إنشاء كلمة سر الأرشيف"}
            </button>
          </>
        ) : (
          <div style={warningStyle}>
            يجب على Super Admin إعداد كلمة سر Archive Vault أولًا.
          </div>
        )}

        {error && (
          <div style={errorStyle}>
            {error}
          </div>
        )}
      </section>
    );
  }

  if (!status.unlocked) {
    return (
      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>
          🔐 Archive Vault مقفول
        </h2>
        <p style={mutedStyle}>
          الصلاحية وحدها لا تكفي. أدخل كلمة سر الأرشيف الإضافية.
        </p>

        <div
          style={{
            display: "flex",
            gap: 9,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value,
              )
            }
            onKeyDown={(event) => {
              if (
                event.key ===
                "Enter"
              ) {
                void unlock();
              }
            }}
            placeholder="كلمة سر الأرشيف"
            autoComplete="current-password"
            style={{
              ...inputStyle,
              maxWidth: 360,
            }}
          />

          <button
            type="button"
            disabled={
              busy || !password
            }
            onClick={() =>
              void unlock()
            }
            style={primaryButtonStyle}
          >
            {busy
              ? "جاري الفتح..."
              : "فتح الخزنة"}
          </button>
        </div>

        {error && (
          <div style={errorStyle}>
            {error}
          </div>
        )}
        {message && (
          <div style={successStyle}>
            {message}
          </div>
        )}
      </section>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
      }}
    >
      <section
        style={{
          ...cardStyle,
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <strong
            style={{
              color: "#166534",
            }}
          >
            🔓 Archive Vault مفتوح
          </strong>
          <p
            style={{
              ...mutedStyle,
              marginBottom: 0,
            }}
          >
            جلسة الخزنة مؤقتة وتُغلق تلقائيًا.
          </p>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void lockVault()
          }
          style={secondaryButtonStyle}
        >
          قفل الخزنة
        </button>
      </section>

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}
      {message && (
        <div style={successStyle}>
          {message}
        </div>
      )}

      <section style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 7,
              flexWrap: "wrap",
            }}
          >
            <TabButton
              active={
                tab === "orders"
              }
              onClick={() =>
                setTab("orders")
              }
            >
              الطلبات ({items?.orders.length || 0})
            </TabButton>
            <TabButton
              active={
                tab === "users"
              }
              onClick={() =>
                setTab("users")
              }
            >
              المستخدمون ({items?.users.length || 0})
            </TabButton>
            <TabButton
              active={
                tab === "logs"
              }
              onClick={() =>
                setTab("logs")
              }
            >
              سجل العمليات ({items?.logs.length || 0})
            </TabButton>
          </div>

          {tab !== "logs" && (
            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="بحث داخل الأرشيف..."
              style={{
                ...inputStyle,
                maxWidth: 320,
              }}
            />
          )}
        </div>
      </section>

      {tab === "orders" && (
        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>
            الطلبات المؤرشفة
          </h2>

          {visibleOrders.length === 0 ? (
            <p style={mutedStyle}>
              لا توجد طلبات مؤرشفة مطابقة.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 10,
              }}
            >
              {visibleOrders.map(
                (order) => (
                  <article
                    key={order.id}
                    style={itemStyle}
                  >
                    <div>
                      <strong
                        style={{
                          color:
                            "#0f2d4a",
                          fontSize: 17,
                        }}
                      >
                        {order.orderNo}
                      </strong>
                      <p
                        style={{
                          margin:
                            "5px 0",
                        }}
                      >
                        {
                          order.customer
                            .name
                        }{" "}
                        —{" "}
                        {
                          order.customer
                            .phone
                        }
                      </p>
                      <small
                        style={
                          mutedStyle
                        }
                      >
                        الحالة:{" "}
                        {order.status} — القيمة:{" "}
                        {money(
                          order.finalTotal ||
                            order.estimatedTotal,
                        )}{" "}
                        ج
                      </small>
                    </div>

                    <div>
                      <strong>
                        سبب الأرشفة
                      </strong>
                      <p
                        style={{
                          margin:
                            "4px 0",
                        }}
                      >
                        {order.archiveReason ||
                          "-"}
                      </p>
                      <small
                        style={
                          mutedStyle
                        }
                      >
                        بواسطة{" "}
                        {order.archivedByLabel ||
                          "-"}{" "}
                        —{" "}
                        {cairoDate(
                          order.archivedAt,
                        )}
                      </small>
                    </div>

                    {status.canRestore && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void restore(
                            "orders",
                            order.id,
                            order.orderNo,
                          )
                        }
                        style={
                          restoreButtonStyle
                        }
                      >
                        استرجاع الطلب
                      </button>
                    )}
                  </article>
                ),
              )}
            </div>
          )}
        </section>
      )}

      {tab === "users" && (
        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>
            المستخدمون المؤرشفون
          </h2>

          {visibleUsers.length === 0 ? (
            <p style={mutedStyle}>
              لا يوجد مستخدمون مؤرشفون مطابقون.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 10,
              }}
            >
              {visibleUsers.map(
                (user) => (
                  <article
                    key={user.id}
                    style={itemStyle}
                  >
                    <div>
                      <strong
                        style={{
                          color:
                            "#0f2d4a",
                          fontSize: 17,
                        }}
                      >
                        {user.name}
                      </strong>
                      <p
                        style={{
                          margin:
                            "5px 0",
                        }}
                      >
                        {user.email}
                        {user.phone
                          ? ` — ${user.phone}`
                          : ""}
                      </p>
                      <small
                        style={
                          mutedStyle
                        }
                      >
                        {user.role}
                      </small>
                    </div>

                    <div>
                      <strong>
                        سبب الأرشفة
                      </strong>
                      <p
                        style={{
                          margin:
                            "4px 0",
                        }}
                      >
                        {user.archiveReason ||
                          "-"}
                      </p>
                      <small
                        style={
                          mutedStyle
                        }
                      >
                        بواسطة{" "}
                        {user.archivedByLabel ||
                          "-"}{" "}
                        —{" "}
                        {cairoDate(
                          user.archivedAt,
                        )}
                      </small>
                    </div>

                    {status.canRestore && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void restore(
                            "users",
                            user.id,
                            user.name,
                          )
                        }
                        style={
                          restoreButtonStyle
                        }
                      >
                        استرجاع المستخدم
                      </button>
                    )}
                  </article>
                ),
              )}
            </div>
          )}
        </section>
      )}

      {tab === "logs" && (
        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>
            سجل Archive Vault
          </h2>

          <div
            style={{
              overflowX: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                minWidth: 700,
              }}
            >
              <thead>
                <tr>
                  <th>الوقت</th>
                  <th>المستخدم</th>
                  <th>العملية</th>
                  <th>Order ID</th>
                </tr>
              </thead>
              <tbody>
                {(items?.logs || []).map(
                  (log) => (
                    <tr key={log.id}>
                      <td>
                        {cairoDate(
                          log.createdAt,
                        )}
                      </td>
                      <td>
                        {log.actorLabel}
                      </td>
                      <td>
                        {actionLabels[
                          log.action
                        ] || log.action}
                      </td>
                      <td>
                        {log.orderId ||
                          "-"}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {status.isSuperAdmin && (
        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>
            تغيير كلمة سر Archive Vault
          </h2>
          <p style={mutedStyle}>
            تغييرها يلغي كل جلسات فتح الخزنة القديمة فورًا.
          </p>

          <div
            style={{
              display: "flex",
              gap: 9,
              flexWrap: "wrap",
            }}
          >
            <input
              type="password"
              value={newPassword}
              onChange={(event) =>
                setNewPassword(
                  event.target.value,
                )
              }
              placeholder="كلمة سر جديدة — 10 أحرف على الأقل"
              autoComplete="new-password"
              style={{
                ...inputStyle,
                maxWidth: 420,
              }}
            />
            <button
              type="button"
              disabled={
                busy ||
                newPassword.length <
                  10
              }
              onClick={() =>
                void savePassword()
              }
              style={secondaryButtonStyle}
            >
              تغيير كلمة السر
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: active
          ? "1px solid #f97316"
          : "1px solid #cbd5e1",
        borderRadius: 10,
        background: active
          ? "#fff7ed"
          : "white",
        color: active
          ? "#9a3412"
          : "#0f2d4a",
        padding: "9px 12px",
        fontWeight: 900,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

const cardStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 18,
};

const itemStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: 14,
  alignItems: "center",
  border: "1px solid #e2e8f0",
  borderRadius: 13,
  padding: 14,
  background: "#f8fafc",
};

const inputStyle: React.CSSProperties = {
  minHeight: 44,
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "9px 12px",
  font: "inherit",
  background: "white",
};

const primaryButtonStyle: React.CSSProperties = {
  minHeight: 44,
  border: 0,
  borderRadius: 10,
  background: "#0f2d4a",
  color: "white",
  padding: "0 16px",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: 42,
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  background: "white",
  color: "#0f2d4a",
  padding: "0 14px",
  fontWeight: 900,
  cursor: "pointer",
};

const restoreButtonStyle: React.CSSProperties = {
  minHeight: 42,
  border: "1px solid #86efac",
  borderRadius: 10,
  background: "#f0fdf4",
  color: "#166534",
  padding: "0 14px",
  fontWeight: 900,
  cursor: "pointer",
};

const mutedStyle: React.CSSProperties = {
  color: "#64748b",
  lineHeight: 1.7,
};

const warningStyle: React.CSSProperties = {
  background: "#fffbeb",
  border: "1px solid #fde68a",
  color: "#92400e",
  borderRadius: 11,
  padding: 12,
};

const errorStyle: React.CSSProperties = {
  marginTop: 12,
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
  borderRadius: 11,
  padding: 12,
};

const successStyle: React.CSSProperties = {
  marginTop: 12,
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  color: "#166534",
  borderRadius: 11,
  padding: 12,
};
