"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type VenticEstimateData = {
  type: "venticEstimate";
  id: string;
  orderNo: string;
  version: number;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "SUPERSEDED";
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
  sentAt: string | null;
  respondedAt: string | null;
  items: Array<{
    id: string;
    description: string;
    unit: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
  }>;
};

type LegacyQuoteData = {
  type: "quote";
  status: string;
  amount: number;
  notes: string | null;
};

type ExtraChargeData = {
  type: "extra";
  status: string;
  title: string;
  reason: string;
  amount: number;
};

type ApprovalData = VenticEstimateData | LegacyQuoteData | ExtraChargeData;

function money(value: number) {
  return Number(value || 0).toLocaleString("ar-EG", {
    maximumFractionDigits: 2,
  });
}

const estimateStatusLabels: Record<VenticEstimateData["status"], string> = {
  DRAFT: "مسودة",
  SENT: "بانتظار ردك",
  ACCEPTED: "تمت الموافقة",
  REJECTED: "تم الرفض",
  SUPERSEDED: "تم استبدال هذه النسخة",
};

export default function ApprovalPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [data, setData] = useState<ApprovalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function load() {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/customer-approval/${token}`, {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "تعذر تحميل التفاصيل");
      }

      setData(result as ApprovalData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل التفاصيل");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function act(decision: "accept" | "reject") {
    if (!token) return;

    setWorking(true);
    setError("");

    try {
      const response = await fetch(`/api/customer-approval/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ decision }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "تعذر تنفيذ الطلب");
      }

      setDone(
        decision === "accept"
          ? "تمت الموافقة بنجاح."
          : "تم تسجيل الرفض بنجاح.",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تنفيذ الطلب");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="order">
      <section
        className="panel success"
        style={{
          maxWidth: 900,
          margin: "32px auto",
          textAlign: "right",
        }}
      >
        <div className="brand center">
          <i>V</i> Ventic Pro
        </div>

        <h1>مراجعة واعتماد المقايسة</h1>
        <p>
          راجع تفاصيل المقايسة أو التكلفة المرسلة لك قبل الموافقة أو الرفض.
        </p>

        {loading && <p>جاري تحميل التفاصيل...</p>}

        {error && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 10,
              background: "#fef2f2",
              color: "#b91c1c",
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        )}

        {done && (
          <div
            className="successBox"
            style={{
              marginTop: 16,
            }}
          >
            {done}
          </div>
        )}

        {!loading && data?.type === "venticEstimate" && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
                marginTop: 22,
              }}
            >
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <strong>رقم الطلب</strong>
                <h3>{data.orderNo}</h3>
              </div>

              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <strong>إصدار المقايسة</strong>
                <h3>{data.version}</h3>
              </div>

              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <strong>الحالة</strong>
                <h3>{estimateStatusLabels[data.status]}</h3>
              </div>
            </div>

            <div style={{ overflowX: "auto", marginTop: 22 }}>
              <table style={{ width: "100%", minWidth: 700 }}>
                <thead>
                  <tr>
                    <th>البيان</th>
                    <th>الكمية</th>
                    <th>الوحدة</th>
                    <th>سعر الوحدة</th>
                    <th>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.description}</td>
                      <td>{item.qty}</td>
                      <td>{item.unit}</td>
                      <td>{money(item.unitPrice)} ج</td>
                      <td>{money(item.lineTotal)} ج</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
                marginTop: 22,
              }}
            >
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <strong>قبل الخصم</strong>
                <h3>{money(data.subtotal)} ج</h3>
              </div>

              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <strong>الخصم</strong>
                <h3>{money(data.discount)} ج</h3>
              </div>

              <div
                style={{
                  border: "2px solid #0f3b64",
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <strong>الإجمالي النهائي</strong>
                <h3>{money(data.total)} ج</h3>
              </div>
            </div>

            {data.notes && (
              <div
                style={{
                  marginTop: 20,
                  padding: 14,
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                }}
              >
                <strong>ملاحظات</strong>
                <p>{data.notes}</p>
              </div>
            )}

            {data.status === "SENT" ? (
              <div
                className="orderActions"
                style={{
                  marginTop: 24,
                  display: "flex",
                  gap: 12,
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  className="ghostBtn"
                  type="button"
                  disabled={working}
                  onClick={() => act("reject")}
                >
                  رفض
                </button>
                <button
                  className="button"
                  type="button"
                  disabled={working}
                  onClick={() => act("accept")}
                >
                  {working ? "جاري التنفيذ..." : "موافقة واعتماد"}
                </button>
              </div>
            ) : (
              <div
                style={{
                  marginTop: 22,
                  padding: 14,
                  background: "#f8fafc",
                  borderRadius: 12,
                  textAlign: "center",
                  fontWeight: 700,
                }}
              >
                {estimateStatusLabels[data.status]}
              </div>
            )}
          </>
        )}

        {!loading && data?.type === "quote" && (
          <div style={{ marginTop: 22 }}>
            <h2>عرض السعر</h2>
            <h3>{money(data.amount)} ج</h3>
            {data.notes && <p>{data.notes}</p>}

            {data.status === "SENT" && (
              <div className="orderActions">
                <button
                  className="ghostBtn"
                  type="button"
                  disabled={working}
                  onClick={() => act("reject")}
                >
                  رفض
                </button>
                <button
                  className="button"
                  type="button"
                  disabled={working}
                  onClick={() => act("accept")}
                >
                  موافقة
                </button>
              </div>
            )}
          </div>
        )}

        {!loading && data?.type === "extra" && (
          <div style={{ marginTop: 22 }}>
            <h2>{data.title}</h2>
            <p>{data.reason}</p>
            <h3>{money(data.amount)} ج</h3>

            {data.status === "PENDING" && (
              <div className="orderActions">
                <button
                  className="ghostBtn"
                  type="button"
                  disabled={working}
                  onClick={() => act("reject")}
                >
                  رفض
                </button>
                <button
                  className="button"
                  type="button"
                  disabled={working}
                  onClick={() => act("accept")}
                >
                  موافقة
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
