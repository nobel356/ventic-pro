"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type ApprovalData = {
  type: "venticEstimate" | "quote" | "extra";
  status: string;
  orderNo?: string;
  version?: number;
  subtotal?: number;
  discount?: number;
  total?: number;
  amount?: number;
  notes?: string | null;
  title?: string;
  reason?: string;
  items?: Array<{
    id: string;
    description: string;
    unit: string;
    qty: number;
    unitPrice: number;
    total: number;
  }>;
};

function money(value: number | undefined) {
  return Number(value || 0).toLocaleString("ar-EG", {
    maximumFractionDigits: 2,
  });
}

export default function ApprovalPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ApprovalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch(`/api/customer-approval/${token}`, {
          cache: "no-store",
        });
        const json = await response.json();

        if (!response.ok) {
          throw new Error(json.error || "تعذر تحميل التفاصيل");
        }

        if (active) setData(json);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "تعذر تحميل التفاصيل");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [token]);

  async function act(decision: "accept" | "reject") {
    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/customer-approval/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "تعذر تنفيذ الطلب");
      }

      setMessage(
        decision === "accept"
          ? "تمت الموافقة على المقايسة بنجاح"
          : "تم تسجيل رفض المقايسة",
      );
      setData((current) =>
        current
          ? {
              ...current,
              status: decision === "accept" ? "ACCEPTED" : "REJECTED",
            }
          : current,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تنفيذ الطلب");
    } finally {
      setBusy(false);
    }
  }

  const canRespond = data?.status === "SENT" && !message;

  return (
    <main className="order">
      <section className="panel success" style={{ maxWidth: 900, margin: "0 auto" }}>
        <div className="brand center">
          <i>V</i> Ventic Pro
        </div>
        <h1>مراجعة وموافقة العميل</h1>

        {loading && <p>جاري تحميل التفاصيل...</p>}
        {error && <div className="successBox">{error}</div>}

        {!loading && data?.type === "venticEstimate" && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                gap: 12,
                margin: "20px 0",
              }}
            >
              <div className="miniCard">
                <strong>رقم الطلب</strong>
                <h3>{data.orderNo || "-"}</h3>
              </div>
              <div className="miniCard">
                <strong>إصدار المقايسة</strong>
                <h3>V{data.version || 1}</h3>
              </div>
              <div className="miniCard">
                <strong>الإجمالي النهائي</strong>
                <h3>{money(data.total)} ج</h3>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 620 }}>
                <thead>
                  <tr>
                    <th>البند</th>
                    <th>الكمية</th>
                    <th>الوحدة</th>
                    <th>سعر الوحدة</th>
                    <th>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.items || []).map((item) => (
                    <tr key={item.id}>
                      <td>{item.description}</td>
                      <td>{item.qty}</td>
                      <td>{item.unit}</td>
                      <td>{money(item.unitPrice)} ج</td>
                      <td>{money(item.total)} ج</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 20, textAlign: "right" }}>
              <p>الإجمالي قبل الخصم: <strong>{money(data.subtotal)} ج</strong></p>
              <p>الخصم: <strong>{money(data.discount)} ج</strong></p>
              <h2>الإجمالي النهائي: {money(data.total)} ج</h2>
              {data.notes && <p>ملاحظات: {data.notes}</p>}
            </div>
          </>
        )}

        {!loading && data?.type === "quote" && (
          <div className="miniCard" style={{ marginTop: 20 }}>
            <h3>عرض سعر</h3>
            <p>القيمة: {money(data.amount)} ج</p>
            {data.notes && <p>{data.notes}</p>}
          </div>
        )}

        {!loading && data?.type === "extra" && (
          <div className="miniCard" style={{ marginTop: 20 }}>
            <h3>{data.title || "تكلفة إضافية"}</h3>
            <p>{data.reason}</p>
            <p>القيمة: {money(data.amount)} ج</p>
          </div>
        )}

        {message && <div className="successBox">{message}</div>}

        {!loading && data && !canRespond && !message && (
          <div className="successBox">تم الرد على هذا الطلب بالفعل.</div>
        )}

        {canRespond && (
          <div className="orderActions" style={{ marginTop: 24 }}>
            <button
              className="ghostBtn"
              disabled={busy}
              onClick={() => act("reject")}
            >
              رفض
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => act("accept")}
            >
              {busy ? "جاري التنفيذ..." : "موافقة واعتماد المقايسة"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
