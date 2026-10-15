"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";

type ArchiveType =
  | "orders"
  | "users"
  | "customers"
  | "leads"
  | "suppliers"
  | "inventory";

type Item = {
  id: string;
  label: string;
  meta?: string;
};

type PageConfig = {
  title: string;
  type: ArchiveType;
  endpoint: string;
  needsVault: boolean;
  read: (data: any) => Item[];
};

const pageConfigs: Record<string, PageConfig> = {
  "/admin/orders": {
    title: "الطلبات",
    type: "orders",
    endpoint: "/api/admin/orders",
    needsVault: false,
    read: (data) =>
      (Array.isArray(data) ? data : []).map((item: any) => ({
        id: item.id,
        label: item.orderNo,
        meta: `${item.customer?.name || "-"} — ${item.customer?.phone || "-"} — ${item.status}`,
      })),
  },
  "/admin/technicians": {
    title: "الفنيون",
    type: "users",
    endpoint: "/api/admin/technicians?management=1",
    needsVault: false,
    read: (data) =>
      (Array.isArray(data) ? data : data?.technicians || []).map((item: any) => ({
        id: item.id,
        label: item.name,
        meta: `${item.login || ""}${item.phone ? ` — ${item.phone}` : ""}`,
      })),
  },
  "/admin/customers": {
    title: "العملاء",
    type: "customers",
    endpoint: "/api/admin/customers",
    needsVault: true,
    read: (data) =>
      (data?.customers || []).map((item: any) => ({
        id: item.id,
        label: item.name,
        meta: `${item.phone || "-"} — ${item.orderCount || 0} طلب`,
      })),
  },
  "/admin/leads": {
    title: "Leads",
    type: "leads",
    endpoint: "/api/admin/leads",
    needsVault: true,
    read: (data) =>
      (Array.isArray(data) ? data : []).map((item: any) => ({
        id: item.id,
        label: item.name || item.phone || "Lead",
        meta: `${item.phone || "-"} — ${item.status}`,
      })),
  },
  "/admin/purchases": {
    title: "الموردون",
    type: "suppliers",
    endpoint: "/api/admin/purchases",
    needsVault: true,
    read: (data) =>
      (data?.suppliers || []).map((item: any) => ({
        id: item.id,
        label: item.name,
        meta: item.phone || item.taxNumber || "",
      })),
  },
  "/admin/inventory": {
    title: "أصناف المخزون",
    type: "inventory",
    endpoint: "/api/admin/inventory",
    needsVault: true,
    read: (data) =>
      (data?.items || []).map((item: any) => ({
        id: item.id,
        label: `${item.sku} — ${item.nameAr}`,
        meta: `رصيد الشركة: ${Number(item.companyQuantity || 0).toLocaleString("ar-EG")} ${item.unit || ""}`,
      })),
  },
  "/admin/users": {
    title: "المستخدمون",
    type: "users",
    endpoint: "/api/admin/users",
    needsVault: false,
    read: (data) =>
      (data?.users || []).map((item: any) => ({
        id: item.id,
        label: item.name,
        meta: `${item.login || ""} — ${item.role}`,
      })),
  },
};

export default function BulkOperationsDock({
  canArchive,
  currentUserId,
}: {
  canArchive: boolean;
  currentUserId: string;
}) {
  const pathname = usePathname();
  const config = pageConfigs[pathname || ""];

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    if (!config) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(config.endpoint, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "تعذر تحميل العناصر.");
      }

      let rows = config.read(data);

      if (config.type === "users") {
        rows = rows.filter((item) => item.id !== currentUserId);
      }

      setItems(rows);
      setSelected((current) =>
        current.filter((id) => rows.some((row) => row.id === id)),
      );
    } catch (err: any) {
      setError(err?.message || "تعذر تحميل العناصر.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setOpen(false);
    setSelected([]);
    setSearch("");
    setError("");

    // V13E makes archive reason-free everywhere visible to the operator.
    // Hide the legacy Users archive button that still opens a reason prompt,
    // because this page now uses the multi-select dock for archive actions.
    // Also hide the old "archive item" tab inside Archive Vault so archiving
    // happens from the operational screens instead of the old reason form.
    function cleanupLegacyArchiveUi() {
      const buttons =
        Array.from(
          document.querySelectorAll("button"),
        ) as HTMLButtonElement[];

      for (const button of buttons) {
        const label =
          String(
            button.textContent || "",
          ).trim();

        if (
          pathname === "/admin/users" &&
          (label === "أرشفة" ||
            label === "جاري الأرشفة...")
        ) {
          button.style.display =
            "none";
        }

        if (
          pathname === "/admin/archive" &&
          label.includes(
            "➕ أرشفة عنصر",
          )
        ) {
          button.style.display =
            "none";
        }
      }
    }

    cleanupLegacyArchiveUi();

    const observer =
      new MutationObserver(
        cleanupLegacyArchiveUi,
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true,
      },
    );

    return () =>
      observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    if (open) void load();
  }, [open]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return items;

    return items.filter((item) =>
      `${item.label} ${item.meta || ""}`.toLowerCase().includes(q),
    );
  }, [items, search]);

  const allVisibleSelected =
    visible.length > 0 &&
    visible.every((item) => selected.includes(item.id));

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  function toggleAllVisible() {
    if (allVisibleSelected) {
      const visibleSet = new Set(visible.map((item) => item.id));
      setSelected((current) => current.filter((id) => !visibleSet.has(id)));
      return;
    }

    setSelected((current) => [
      ...new Set([...current, ...visible.map((item) => item.id)]),
    ]);
  }

  async function ensureVault() {
    if (!config?.needsVault) return true;

    const statusResponse = await fetch("/api/admin/archive/status", {
      cache: "no-store",
    });
    const status = await statusResponse.json();

    if (statusResponse.ok && status?.unlocked) {
      return true;
    }

    const password = window.prompt(
      "Archive Vault مقفول. اكتب كلمة سر الأرشيف لتنفيذ الأرشفة الجماعية:",
    );

    if (!password) return false;

    const unlock = await fetch("/api/admin/archive/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const unlockData = await unlock.json();

    if (!unlock.ok) {
      throw new Error(
        unlockData?.error || "كلمة سر الأرشيف غير صحيحة.",
      );
    }

    return true;
  }

  async function archiveSelected() {
    if (!config || selected.length === 0) return;

    if (
      !window.confirm(
        `أرشفة ${selected.length.toLocaleString("ar-EG")} عنصر محدد من ${config.title}؟`,
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      if (!(await ensureVault())) return;

      const failed: string[] = [];

      for (const id of selected) {
        const response = await fetch(
          `/api/admin/archive/${config.type}/${id}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            // Backend V13A/V13B still has a reason field internally.
            // The user is no longer asked for one.
            body: JSON.stringify({ reason: "بدون سبب" }),
          },
        );

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          failed.push(data?.error || id);
        }
      }

      if (failed.length) {
        setError(
          `تم تنفيذ العملية مع ${failed.length.toLocaleString("ar-EG")} خطأ: ${failed
            .slice(0, 5)
            .join(" • ")}`,
        );
      }

      setSelected([]);
      await load();

      if (!failed.length) {
        setOpen(false);
      }
    } catch (err: any) {
      setError(err?.message || "تعذر تنفيذ الأرشفة الجماعية.");
    } finally {
      setBusy(false);
    }
  }

  if (!canArchive || !config) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={floatingButton}
      >
        ☑ إدارة متعددة
      </button>

      {open && (
        <div style={overlayStyle} onMouseDown={() => setOpen(false)}>
          <aside
            dir="rtl"
            style={drawerStyle}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div style={headStyle}>
              <div>
                <h2 style={{ margin: 0 }}>تحديد متعدد — {config.title}</h2>
                <small style={{ color: "#64748b" }}>
                  اختار عنصر أو أكثر ثم نفّذ الأرشفة مرة واحدة.
                </small>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={closeStyle}
              >
                ✕
              </button>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="بحث..."
              style={inputStyle}
            />

            <div style={toolbarStyle}>
              <label style={{ display: "flex", gap: 7, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                />
                تحديد الكل الظاهر
              </label>

              <strong>المحدد: {selected.length}</strong>
            </div>

            {error && <div style={errorStyle}>{error}</div>}

            <div style={listStyle}>
              {loading ? (
                <p>جاري التحميل...</p>
              ) : visible.length === 0 ? (
                <p style={{ color: "#64748b" }}>لا توجد عناصر.</p>
              ) : (
                visible.map((item) => (
                  <label key={item.id} style={rowStyle}>
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      onChange={() => toggle(item.id)}
                    />
                    <span>
                      <strong>{item.label}</strong>
                      {item.meta && (
                        <small
                          style={{
                            display: "block",
                            color: "#64748b",
                            marginTop: 3,
                          }}
                        >
                          {item.meta}
                        </small>
                      )}
                    </span>
                  </label>
                ))
              )}
            </div>

            <div style={footerStyle}>
              <button
                type="button"
                disabled={busy || selected.length === 0}
                onClick={() => void archiveSelected()}
                style={archiveStyle}
              >
                {busy
                  ? "جاري التنفيذ..."
                  : `أرشفة المحدد (${selected.length})`}
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

const floatingButton: React.CSSProperties = {
  position: "fixed",
  left: 18,
  bottom: 18,
  zIndex: 1300,
  minHeight: 46,
  border: "1px solid #fdba74",
  borderRadius: 14,
  background: "#fff7ed",
  color: "#9a3412",
  padding: "0 16px",
  fontWeight: 900,
  boxShadow: "0 10px 28px rgba(15,23,42,.16)",
  cursor: "pointer",
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1600,
  background: "rgba(15,23,42,.42)",
  display: "flex",
  justifyContent: "flex-start",
};

const drawerStyle: React.CSSProperties = {
  width: "min(480px, 94vw)",
  height: "100%",
  background: "white",
  padding: 18,
  boxSizing: "border-box",
  display: "grid",
  gridTemplateRows: "auto auto auto auto 1fr auto",
  gap: 12,
  boxShadow: "12px 0 35px rgba(15,23,42,.2)",
};

const headStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "flex-start",
};

const closeStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  background: "white",
  cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 44,
  boxSizing: "border-box",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "0 11px",
  font: "inherit",
};

const toolbarStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
  padding: 10,
  background: "#f8fafc",
  borderRadius: 10,
};

const listStyle: React.CSSProperties = {
  minHeight: 0,
  overflowY: "auto",
  display: "grid",
  gap: 8,
  alignContent: "start",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  border: "1px solid #e2e8f0",
  borderRadius: 11,
  padding: 11,
  cursor: "pointer",
};

const footerStyle: React.CSSProperties = {
  borderTop: "1px solid #e2e8f0",
  paddingTop: 12,
};

const archiveStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 46,
  border: 0,
  borderRadius: 11,
  background: "#f97316",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 10,
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
};
