"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const labels: Record<string, string> = {
  NEW: "جديد",
  CONFIRMED: "تم التأكيد",
  ASSIGNED: "تم تعيين فني",
  ON_THE_WAY: "في الطريق",
  ARRIVED: "وصل",
  IN_PROGRESS: "جاري التنفيذ",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [techs, setTechs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [technician, setTechnician] = useState("");
  const [area, setArea] = useState("");
  const [date, setDate] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [ordersResponse, techResponse] = await Promise.all([
        fetch("/api/admin/orders", { cache: "no-store" }),
        fetch("/api/admin/technicians", { cache: "no-store" }),
      ]);
      const [ordersData, techData] = await Promise.all([
        ordersResponse.json(),
        techResponse.json(),
      ]);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setTechs(Array.isArray(techData) ? techData : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const areas = useMemo(
    () =>
      Array.from(
        new Set(
          orders
            .map((order) => String(order.area || "").trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b, "ar")),
    [orders],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return orders.filter((order) => {
      const haystack = [
        order.orderNo,
        order.customer?.name,
        order.customer?.phone,
        order.governorate,
        order.area,
        order.address,
        order.technician?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (q && !haystack.includes(q)) return false;
      if (status && order.status !== status) return false;

      if (technician === "__NONE__" && order.technicianId) return false;
      if (
        technician &&
        technician !== "__NONE__" &&
        order.technicianId !== technician
      ) {
        return false;
      }

      if (area && String(order.area || "") !== area) return false;
      if (date && order.preferredDate !== date) return false;

      return true;
    });
  }, [orders, search, status, technician, area, date]);

  async function change(id: string, nextStatus: string) {
    await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    await load();
  }

  async function assign(id: string, technicianId: string) {
    if (!technicianId) return;

    await fetch(`/api/admin/orders/${id}/assign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ technicianId }),
    });
    await load();
  }

  function clearFilters() {
    setSearch("");
    setStatus("");
    setTechnician("");
    setArea("");
    setDate("");
  }

  return (
    <main className="admin" dir="rtl">
      <header>
        <div className="brand">
          <i>V</i> Ventic Pro
        </div>
        <nav>
          <Link href="/admin">الرئيسية</Link>
          <Link href="/admin/orders">الطلبات</Link>
          <Link href="/admin/schedule">جدول الفنيين</Link>
          <Link href="/admin/technicians">الفنيون</Link>
          <Link href="/admin/pricing">الأسعار</Link>
        </nav>
      </header>

      <section>
        <div className="adminTitle">
          <div>
            <h1>الطلبات</h1>
            <p>بحث وفلترة ومتابعة الحالة وتعيين الفني.</p>
          </div>
          <span>
            {filtered.length} من {orders.length} طلب
          </span>
        </div>

        <div
          style={{
            background: "white",
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            padding: 16,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(180px,1fr))",
              gap: 10,
            }}
          >
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="بحث: رقم الطلب، الاسم، الهاتف، المنطقة..."
              style={fieldStyle}
            />

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              style={fieldStyle}
            >
              <option value="">كل الحالات</option>
              {Object.entries(labels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={technician}
              onChange={(event) => setTechnician(event.target.value)}
              style={fieldStyle}
            >
              <option value="">كل الفنيين</option>
              <option value="__NONE__">بدون فني</option>
              {techs.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.name}
                </option>
              ))}
            </select>

            <select
              value={area}
              onChange={(event) => setArea(event.target.value)}
              style={fieldStyle}
            >
              <option value="">كل المناطق</option>
              {areas.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              style={fieldStyle}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
              marginTop: 12,
              flexWrap: "wrap",
            }}
          >
            <small style={{ color: "#64748b" }}>
              الفلاتر تعمل معًا ويمكنك البحث بالهاتف أو رقم الطلب مباشرة.
            </small>
            <button
              type="button"
              onClick={clearFilters}
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: 10,
                background: "white",
                padding: "8px 13px",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              مسح الفلاتر
            </button>
          </div>
        </div>

        {loading ? (
          <p>جاري التحميل...</p>
        ) : filtered.length === 0 ? (
          <div className="empty">لا توجد طلبات مطابقة للفلاتر الحالية.</div>
        ) : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>رقم الطلب</th>
                  <th>العميل</th>
                  <th>المنطقة</th>
                  <th>الموعد</th>
                  <th>التقديري</th>
                  <th>الفني</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        style={{ fontWeight: 800, color: "#075985" }}
                      >
                        {order.orderNo}
                      </Link>
                    </td>
                    <td>
                      {order.customer?.name || "-"}
                      <small>{order.customer?.phone || "-"}</small>
                    </td>
                    <td>
                      {order.governorate || "-"} - {order.area || "-"}
                    </td>
                    <td>
                      {order.preferredDate || "-"}
                      <small>{order.preferredTime || "-"}</small>
                    </td>
                    <td>
                      {Number(order.estimatedTotal || 0).toLocaleString(
                        "ar-EG",
                      )}{" "}
                      ج
                    </td>
                    <td>
                      <select
                        value={order.technicianId || ""}
                        onChange={(event) =>
                          void assign(order.id, event.target.value)
                        }
                      >
                        <option value="">غير معين</option>
                        {techs.map((tech) => (
                          <option value={tech.id} key={tech.id}>
                            {tech.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={order.status}
                        onChange={(event) =>
                          void change(order.id, event.target.value)
                        }
                      >
                        {Object.entries(labels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

const fieldStyle: React.CSSProperties = {
  minHeight: 44,
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "0 11px",
  background: "white",
  font: "inherit",
  boxSizing: "border-box",
  width: "100%",
};
