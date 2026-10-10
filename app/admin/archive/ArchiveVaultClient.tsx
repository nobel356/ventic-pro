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

type ArchiveTab =
  | "orders"
  | "users"
  | "customers"
  | "leads"
  | "suppliers"
  | "inventory"
  | "add"
  | "logs";

type ArchiveItems = {
  orders: any[];
  users: any[];
  customers: any[];
  leads: any[];
  suppliers: any[];
  inventory: any[];
  logs: any[];
};

type CandidateType =
  | "customers"
  | "leads"
  | "suppliers"
  | "inventory";

type Candidate = {
  id: string;
  label: string;
  meta: string;
};

const tabLabels: Record<Exclude<ArchiveTab, "add" | "logs">, string> = {
  orders: "الطلبات",
  users: "المستخدمون",
  customers: "العملاء",
  leads: "Leads",
  suppliers: "الموردون",
  inventory: "أصناف المخزون",
};

const candidateLabels: Record<CandidateType, string> = {
  customers: "عميل",
  leads: "Lead",
  suppliers: "مورد",
  inventory: "صنف مخزون",
};

const actionLabels: Record<string, string> = {
  ARCHIVE_ORDER: "أرشفة طلب",
  ARCHIVE_ORDER_RESTORED: "استرجاع طلب",
  ARCHIVE_USER: "أرشفة مستخدم",
  ARCHIVE_USER_RESTORED: "استرجاع مستخدم",
  ARCHIVE_CUSTOMER: "أرشفة عميل",
  ARCHIVE_CUSTOMER_RESTORED: "استرجاع عميل",
  ARCHIVE_LEAD: "أرشفة Lead",
  ARCHIVE_LEAD_RESTORED: "استرجاع Lead",
  ARCHIVE_SUPPLIER: "أرشفة مورد",
  ARCHIVE_SUPPLIER_RESTORED: "استرجاع مورد",
  ARCHIVE_INVENTORY_ITEM: "أرشفة صنف مخزون",
  ARCHIVE_INVENTORY_ITEM_RESTORED: "استرجاع صنف مخزون",
  ARCHIVE_VAULT_UNLOCKED: "فتح الخزنة",
  ARCHIVE_VAULT_UNLOCK_FAILED: "محاولة فتح فاشلة",
  ARCHIVE_VAULT_UNLOCK_RATE_LIMITED: "محاولات فتح كثيرة",
  ARCHIVE_VAULT_LOCKED: "قفل الخزنة",
  ARCHIVE_VAULT_PASSWORD_SET: "إعداد كلمة سر الخزنة",
  ARCHIVE_VAULT_PASSWORD_CHANGED: "تغيير كلمة سر الخزنة",
};

function cairoDate(value: string | Date | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ar-EG", {
    timeZone: "Africa/Cairo",
  });
}

function money(value: unknown) {
  return Number(value || 0).toLocaleString("ar-EG", {
    maximumFractionDigits: 2,
  });
}

function itemLabel(tab: Exclude<ArchiveTab, "add" | "logs">, item: any) {
  if (tab === "orders") return item.orderNo;
  if (tab === "users") return item.name;
  if (tab === "customers") return item.name;
  if (tab === "leads") return item.name || item.phone || "Lead";
  if (tab === "suppliers") return item.name;
  return `${item.sku} — ${item.nameAr}`;
}

function itemMeta(tab: Exclude<ArchiveTab, "add" | "logs">, item: any) {
  if (tab === "orders") {
    return `${item.customer?.name || "-"} — ${item.customer?.phone || "-"} — ${item.status} — ${money(item.finalTotal || item.estimatedTotal)} ج`;
  }
  if (tab === "users") {
    return `${item.email || "-"}${item.phone ? ` — ${item.phone}` : ""} — ${item.role}`;
  }
  if (tab === "customers") {
    return `${item.phone || "-"}${item.email ? ` — ${item.email}` : ""} — ${item._count?.orders || 0} طلب — ${item._count?.properties || 0} عقار`;
  }
  if (tab === "leads") {
    return `${item.phone || "بدون هاتف"} — ${item.source || "بدون مصدر"} — ${item.status} — خطوة ${item.currentStep}/4`;
  }
  if (tab === "suppliers") {
    return `${item.phone || "بدون هاتف"}${item.taxNumber ? ` — ضريبي ${item.taxNumber}` : ""} — ${item._count?.purchases || 0} توريد`;
  }
  return `رصيد الشركة ${money(item.quantity)} ${item.unit || ""}`;
}

function searchable(tab: Exclude<ArchiveTab, "add" | "logs">, item: any) {
  return [
    itemLabel(tab, item),
    itemMeta(tab, item),
    item.archiveReason,
    item.archivedByLabel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function ArchiveVaultClient() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [items, setItems] = useState<ArchiveItems | null>(null);
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<ArchiveTab>("orders");
  const [search, setSearch] = useState("");

  const [candidateType, setCandidateType] =
    useState<CandidateType>("customers");
  const [candidateQuery, setCandidateQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateLoading, setCandidateLoading] = useState(false);

  async function loadStatus() {
    const response = await fetch("/api/admin/archive/status", {
      cache: "no-store",
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "تعذر تحميل حالة الأرشيف.");
    }

    setStatus(data);
    return data as StatusData;
  }

  async function loadItems() {
    const response = await fetch("/api/admin/archive/items", {
      cache: "no-store",
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "تعذر تحميل العناصر المؤرشفة.");
    }

    setItems({
      orders: data.orders || [],
      users: data.users || [],
      customers: data.customers || [],
      leads: data.leads || [],
      suppliers: data.suppliers || [],
      inventory: data.inventory || [],
      logs: data.logs || [],
    });
  }

  async function refresh() {
    setLoading(true);
    setError("");

    try {
      const nextStatus = await loadStatus();

      if (nextStatus.configured && nextStatus.unlocked) {
        await loadItems();
      } else {
        setItems(null);
      }
    } catch (err: any) {
      setError(err?.message || "حدث خطأ.");
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
      const response = await fetch("/api/admin/archive/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "تعذر فتح الأرشيف.");
      }

      setPassword("");
      setMessage("تم فتح Archive Vault.");
      await refresh();
    } catch (err: any) {
      setError(err?.message || "تعذر فتح الأرشيف.");
    } finally {
      setBusy(false);
    }
  }

  async function savePassword() {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/archive/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "تعذر حفظ كلمة السر.");
      }

      setNewPassword("");
      setMessage(
        status?.configured
          ? "تم تغيير كلمة سر الأرشيف."
          : "تم إعداد كلمة سر الأرشيف وفتح الخزنة.",
      );
      await refresh();
    } catch (err: any) {
      setError(err?.message || "تعذر حفظ كلمة السر.");
    } finally {
      setBusy(false);
    }
  }

  async function lockVault() {
    setBusy(true);
    setError("");

    try {
      await fetch("/api/admin/archive/lock", {
        method: "POST",
      });
      setItems(null);
      setCandidates([]);
      setMessage("تم قفل Archive Vault.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function restore(
    type: Exclude<ArchiveTab, "add" | "logs">,
    id: string,
    label: string,
  ) {
    if (!window.confirm(`استرجاع ${label} إلى النظام؟`)) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/archive/${type}/${id}`,
        { method: "POST" },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "تعذر الاسترجاع.");
      }

      setMessage(`تم استرجاع ${label}.`);
      await loadItems();
    } catch (err: any) {
      setError(err?.message || "تعذر الاسترجاع.");
    } finally {
      setBusy(false);
    }
  }

  async function searchCandidates() {
    const q = candidateQuery.trim();

    if (q.length < 2) {
      setCandidates([]);
      setError("اكتب حرفين على الأقل للبحث.");
      return;
    }

    setCandidateLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/archive/candidates?type=${encodeURIComponent(candidateType)}&q=${encodeURIComponent(q)}`,
        { cache: "no-store" },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "تعذر البحث.");
      }

      setCandidates(data.items || []);
    } catch (err: any) {
      setError(err?.message || "تعذر البحث.");
    } finally {
      setCandidateLoading(false);
    }
  }

  async function archiveCandidate(item: Candidate) {
    const reason = window.prompt(
      `سبب أرشفة ${item.label}:`,
    );

    if (reason === null) return;

    if (reason.trim().length < 3) {
      setError("سبب الأرشفة يجب ألا يقل عن 3 أحرف.");
      return;
    }

    if (
      !window.confirm(
        `سيتم نقل ${item.label} إلى Archive Vault مع الحفاظ على التاريخ المرتبط. متابعة؟`,
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/archive/${candidateType}/${item.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason.trim() }),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "تعذر الأرشفة.");
      }

      setMessage(`تم نقل ${item.label} إلى Archive Vault.`);
      setCandidates((current) =>
        current.filter((candidate) => candidate.id !== item.id),
      );
      await loadItems();
    } catch (err: any) {
      setError(err?.message || "تعذر الأرشفة.");
    } finally {
      setBusy(false);
    }
  }

  const visibleItems = useMemo(() => {
    if (!items || tab === "add" || tab === "logs") return [];
    const rows = items[tab] || [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((item) => searchable(tab, item).includes(q));
  }, [items, tab, search]);

  if (loading) {
    return <div style={cardStyle}>جاري تحميل الأرشيف...</div>;
  }

  if (!status) {
    return <div style={errorStyle}>تعذر تحميل حالة الأرشيف.</div>;
  }

  if (!status.configured) {
    return (
      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>إعداد Archive Vault</h2>

        {status.isSuperAdmin ? (
          <>
            <p style={mutedStyle}>
              حدد كلمة سر إضافية للخزنة. لا يتم حفظ الكلمة نفسها، بل Hash فقط.
            </p>

            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="10 أحرف على الأقل"
              autoComplete="new-password"
              style={inputStyle}
            />

            <button
              type="button"
              disabled={busy || newPassword.length < 10}
              onClick={() => void savePassword()}
              style={primaryButtonStyle}
            >
              {busy ? "جاري الحفظ..." : "إنشاء كلمة سر الأرشيف"}
            </button>
          </>
        ) : (
          <div style={warningStyle}>
            يجب على Super Admin إعداد كلمة سر Archive Vault أولًا.
          </div>
        )}

        {error && <div style={errorStyle}>{error}</div>}
      </section>
    );
  }

  if (!status.unlocked) {
    return (
      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>🔐 Archive Vault مقفول</h2>
        <p style={mutedStyle}>
          الصلاحية وحدها لا تكفي. أدخل كلمة سر الأرشيف الإضافية.
        </p>

        <div style={rowStyle}>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void unlock();
            }}
            placeholder="كلمة سر الأرشيف"
            autoComplete="current-password"
            style={{ ...inputStyle, maxWidth: 360 }}
          />

          <button
            type="button"
            disabled={busy || !password}
            onClick={() => void unlock()}
            style={primaryButtonStyle}
          >
            {busy ? "جاري الفتح..." : "فتح الخزنة"}
          </button>
        </div>

        {error && <div style={errorStyle}>{error}</div>}
        {message && <div style={successStyle}>{message}</div>}
      </section>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section
        style={{
          ...cardStyle,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <strong style={{ color: "#166534" }}>
            🔓 Archive Vault مفتوح
          </strong>
          <p style={{ ...mutedStyle, marginBottom: 0 }}>
            جلسة الخزنة مؤقتة وتُغلق تلقائيًا.
          </p>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void lockVault()}
          style={secondaryButtonStyle}
        >
          قفل الخزنة
        </button>
      </section>

      {error && <div style={errorStyle}>{error}</div>}
      {message && <div style={successStyle}>{message}</div>}

      <section style={cardStyle}>
        <div style={rowBetweenStyle}>
          <div style={rowStyle}>
            {(Object.keys(tabLabels) as Array<
              Exclude<ArchiveTab, "add" | "logs">
            >).map((key) => (
              <TabButton
                key={key}
                active={tab === key}
                onClick={() => {
                  setTab(key);
                  setSearch("");
                }}
              >
                {tabLabels[key]} ({items?.[key]?.length || 0})
              </TabButton>
            ))}

            {status.canArchive && (
              <TabButton
                active={tab === "add"}
                onClick={() => {
                  setTab("add");
                  setSearch("");
                }}
              >
                ➕ أرشفة عنصر
              </TabButton>
            )}

            <TabButton
              active={tab === "logs"}
              onClick={() => {
                setTab("logs");
                setSearch("");
              }}
            >
              سجل العمليات ({items?.logs.length || 0})
            </TabButton>
          </div>

          {tab !== "logs" && tab !== "add" && (
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="بحث داخل الأرشيف..."
              style={{ ...inputStyle, maxWidth: 320 }}
            />
          )}
        </div>
      </section>

      {tab === "add" && status.canArchive && (
        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>نقل عنصر إلى الأرشيف</h2>
          <p style={mutedStyle}>
            البحث هنا يعرض العناصر غير المؤرشفة فقط. التاريخ المرتبط لا يُحذف.
          </p>

          <div style={searchGridStyle}>
            <select
              value={candidateType}
              onChange={(event) => {
                setCandidateType(event.target.value as CandidateType);
                setCandidates([]);
                setCandidateQuery("");
              }}
              style={inputStyle}
            >
              <option value="customers">العملاء</option>
              <option value="leads">Leads</option>
              <option value="suppliers">الموردون</option>
              <option value="inventory">أصناف المخزون</option>
            </select>

            <input
              value={candidateQuery}
              onChange={(event) => setCandidateQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void searchCandidates();
              }}
              placeholder={`ابحث عن ${candidateLabels[candidateType]}...`}
              style={inputStyle}
            />

            <button
              type="button"
              disabled={candidateLoading || candidateQuery.trim().length < 2}
              onClick={() => void searchCandidates()}
              style={primaryButtonStyle}
            >
              {candidateLoading ? "جاري البحث..." : "بحث"}
            </button>
          </div>

          <div style={{ display: "grid", gap: 9, marginTop: 16 }}>
            {candidates.map((item) => (
              <article key={item.id} style={archiveCardStyle}>
                <div>
                  <strong>{item.label}</strong>
                  <small style={{ ...mutedStyle, display: "block", marginTop: 4 }}>
                    {item.meta}
                  </small>
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void archiveCandidate(item)}
                  style={dangerButtonStyle}
                >
                  نقل للأرشيف
                </button>
              </article>
            ))}

            {!candidateLoading &&
              candidateQuery.trim().length >= 2 &&
              candidates.length === 0 && (
                <small style={mutedStyle}>
                  لا توجد نتائج حالية. اضغط بحث بعد كتابة الاسم/الكود.
                </small>
              )}
          </div>
        </section>
      )}

      {tab !== "add" && tab !== "logs" && (
        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>{tabLabels[tab]} المؤرشفة</h2>

          {visibleItems.length === 0 ? (
            <p style={mutedStyle}>لا توجد عناصر مؤرشفة مطابقة.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {visibleItems.map((item) => (
                <article key={item.id} style={archiveCardStyle}>
                  <div>
                    <strong style={{ color: "#0f2d4a", fontSize: 17 }}>
                      {itemLabel(tab, item)}
                    </strong>
                    <small style={{ ...mutedStyle, display: "block", marginTop: 5 }}>
                      {itemMeta(tab, item)}
                    </small>
                  </div>

                  <div>
                    <strong>سبب الأرشفة</strong>
                    <p style={{ margin: "4px 0" }}>
                      {item.archiveReason || "-"}
                    </p>
                    <small style={mutedStyle}>
                      بواسطة {item.archivedByLabel || "-"} —{" "}
                      {cairoDate(item.archivedAt)}
                    </small>
                  </div>

                  {status.canRestore && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void restore(tab, item.id, itemLabel(tab, item))
                      }
                      style={restoreButtonStyle}
                    >
                      استرجاع
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "logs" && (
        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>سجل Archive Vault</h2>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 760 }}>
              <thead>
                <tr>
                  <th>الوقت</th>
                  <th>المستخدم</th>
                  <th>العملية</th>
                  <th>Order ID</th>
                </tr>
              </thead>
              <tbody>
                {(items?.logs || []).map((log) => (
                  <tr key={log.id}>
                    <td>{cairoDate(log.createdAt)}</td>
                    <td>{log.actorLabel}</td>
                    <td>{actionLabels[log.action] || log.action}</td>
                    <td>{log.orderId || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {status.isSuperAdmin && (
        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>تغيير كلمة سر Archive Vault</h2>
          <p style={mutedStyle}>
            تغييرها يلغي كل جلسات فتح الخزنة القديمة فورًا.
          </p>

          <div style={rowStyle}>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="كلمة سر جديدة — 10 أحرف على الأقل"
              autoComplete="new-password"
              style={{ ...inputStyle, maxWidth: 420 }}
            />
            <button
              type="button"
              disabled={busy || newPassword.length < 10}
              onClick={() => void savePassword()}
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
        background: active ? "#fff7ed" : "white",
        color: active ? "#9a3412" : "#0f2d4a",
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

const archiveCardStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: 14,
  alignItems: "center",
  border: "1px solid #e2e8f0",
  borderRadius: 13,
  padding: 14,
  background: "#f8fafc",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  gap: 9,
  flexWrap: "wrap",
  alignItems: "center",
};

const rowBetweenStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
};

const searchGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(180px,.7fr) minmax(240px,1.6fr) auto",
  gap: 9,
  alignItems: "center",
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

const dangerButtonStyle: React.CSSProperties = {
  minHeight: 42,
  border: "1px solid #fecaca",
  borderRadius: 10,
  background: "#fef2f2",
  color: "#991b1b",
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
