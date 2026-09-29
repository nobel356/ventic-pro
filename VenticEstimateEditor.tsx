"use client";

import { useEffect, useState } from "react";

type EstimateStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "SUPERSEDED";

type EstimateItem = {
  id?: string;
  description: string;
  unit: string;
  qty: number;
  unitPrice: number;
  total: number;
};

type Estimate = {
  id: string;
  orderId: string;
  version: number;
  status: EstimateStatus;
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
  customerToken: string;
  sentAt?: string | null;
  respondedAt?: string | null;
  createdAt?: string;
  items: EstimateItem[];
};

const statusLabels: Record<EstimateStatus, string> = {
  DRAFT: "مسودة",
  SENT: "مرسلة للعميل",
  ACCEPTED: "معتمدة",
  REJECTED: "مرفوضة",
  SUPERSEDED: "تم استبدالها بإصدار أحدث",
};

function money(value: number) {
  return Number(value || 0).toLocaleString("ar-EG", {
    maximumFractionDigits: 2,
  });
}

export default function VenticEstimateEditor({ orderId }: { orderId: string }) {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState("");

  const latest = estimates[0] || null;

  useEffect(() => {
    setOrigin(window.location.origin);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/ventic-estimates?orderId=${encodeURIComponent(orderId)}`,
        { cache: "no-store" },
      );
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "تعذر تحميل المقايسات");
      setEstimates(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل المقايسات");
    } finally {
      setLoading(false);
    }
  }

  async function post(payload: Record<string, unknown>) {
    const response = await fetch("/api/admin/ventic-estimates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || "تعذر تنفيذ العملية");
    return json;
  }

  function replaceEstimate(next: Estimate) {
    setEstimates((current) => {
      const exists = current.some((item) => item.id === next.id);
      const updated = exists
        ? current.map((item) => (item.id === next.id ? next : item))
        : [next, ...current];
      return [...updated].sort((a, b) => b.version - a.version);
    });
  }

  async function createFromCustomer() {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const created = await post({ action: "create", orderId });
      replaceEstimate(created);
      setMessage("تم إنشاء مقايسة Ventic Pro من مقايسة العميل. يمكنك تعديلها الآن.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إنشاء المقايسة");
    } finally {
      setBusy(false);
    }
  }

  function patchLatest(patch: Partial<Estimate>) {
    if (!latest) return;
    replaceEstimate({ ...latest, ...patch });
  }

  function patchItem(index: number, patch: Partial<EstimateItem>) {
    if (!latest) return;
    const items = latest.items.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const next = { ...item, ...patch };
      return {
        ...next,
        total: Number(next.qty || 0) * Number(next.unitPrice || 0),
      };
    });
    patchLatest({ items });
  }

  function addItem() {
    if (!latest) return;
    patchLatest({
      items: [
        ...latest.items,
        {
          description: "",
          unit: "وحدة",
          qty: 1,
          unitPrice: 0,
          total: 0,
        },
      ],
    });
  }

  function removeItem(index: number) {
    if (!latest) return;
    patchLatest({
      items: latest.items.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  async function saveDraft(showMessage = true): Promise<Estimate | null> {
    if (!latest || latest.status !== "DRAFT") return null;

    setBusy(true);
    setError("");
    if (showMessage) setMessage("");

    try {
      const saved = await post({
        action: "save",
        estimateId: latest.id,
        discount: Number(latest.discount || 0),
        notes: latest.notes || "",
        items: latest.items.map((item) => ({
          description: item.description,
          unit: item.unit,
          qty: Number(item.qty),
          unitPrice: Number(item.unitPrice),
        })),
      });
      replaceEstimate(saved);
      if (showMessage) setMessage("تم حفظ مسودة المقايسة.");
      return saved;
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ المقايسة");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function sendToCustomer() {
    setMessage("");
    setError("");
    const saved = await saveDraft(false);
    if (!saved) return;

    setBusy(true);
    try {
      const result = await post({ action: "send", estimateId: saved.id });
      replaceEstimate(result.estimate);
      setMessage("تم تثبيت المقايسة. انسخ رابط العميل وأرسله له للموافقة.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إرسال المقايسة");
    } finally {
      setBusy(false);
    }
  }

  async function createNewVersion() {
    if (!latest) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const created = await post({
        action: "newVersion",
        estimateId: latest.id,
      });
      replaceEstimate(created);
      setMessage(`تم إنشاء الإصدار V${created.version} كمسودة جديدة.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إنشاء إصدار جديد");
    } finally {
      setBusy(false);
    }
  }

  async function copyApprovalLink() {
    if (!latest || !origin) return;
    const url = `${origin}/customer/approval/${latest.customerToken}`;
    await navigator.clipboard.writeText(url);
    setMessage("تم نسخ رابط موافقة العميل.");
  }

  const calculatedSubtotal = latest
    ? latest.items.reduce(
        (sum, item) => sum + Number(item.qty || 0) * Number(item.unitPrice || 0),
        0,
      )
    : 0;
  const calculatedTotal = Math.max(
    0,
    calculatedSubtotal - Number(latest?.discount || 0),
  );
  const approvalUrl =
    latest && latest.status !== "DRAFT" && origin
      ? `${origin}/customer/approval/${latest.customerToken}`
      : "";

  return (
    <div className="adminQuick" style={{ marginTop: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ marginBottom: 6 }}>مقايسة Ventic Pro النهائية</h2>
          <p style={{ margin: 0 }}>
            هذه مقايسة منفصلة عن مقايسة العميل الأصلية، وهي التي ستُعتمد عليها الفاتورة بعد موافقة العميل.
          </p>
        </div>
        {latest && (
          <strong>
            V{latest.version} — {statusLabels[latest.status]}
          </strong>
        )}
      </div>

      {loading && <p>جاري تحميل المقايسات...</p>}
      {message && <div className="successBox" style={{ marginTop: 16 }}>{message}</div>}
      {error && <div className="successBox" style={{ marginTop: 16 }}>{error}</div>}

      {!loading && !latest && (
        <div style={{ marginTop: 18 }}>
          <button className="button" disabled={busy} onClick={createFromCustomer}>
            {busy ? "جاري الإنشاء..." : "إنشاء مقايسة Ventic Pro من مقايسة العميل"}
          </button>
        </div>
      )}

      {latest && latest.status === "DRAFT" && (
        <div style={{ marginTop: 18 }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 880 }}>
              <thead>
                <tr>
                  <th>البند</th>
                  <th>الكمية</th>
                  <th>الوحدة</th>
                  <th>سعر الوحدة</th>
                  <th>الإجمالي</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {latest.items.map((item, index) => (
                  <tr key={item.id || index}>
                    <td>
                      <input
                        value={item.description}
                        onChange={(event) =>
                          patchItem(index, { description: event.target.value })
                        }
                        style={{ width: "100%", minWidth: 260 }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.qty}
                        onChange={(event) =>
                          patchItem(index, { qty: Number(event.target.value) })
                        }
                        style={{ width: 100 }}
                      />
                    </td>
                    <td>
                      <input
                        value={item.unit}
                        onChange={(event) =>
                          patchItem(index, { unit: event.target.value })
                        }
                        style={{ width: 100 }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(event) =>
                          patchItem(index, { unitPrice: Number(event.target.value) })
                        }
                        style={{ width: 130 }}
                      />
                    </td>
                    <td>{money(Number(item.qty || 0) * Number(item.unitPrice || 0))} ج</td>
                    <td>
                      <button
                        type="button"
                        className="ghostBtn"
                        onClick={() => removeItem(index)}
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            className="ghostBtn"
            onClick={addItem}
            style={{ marginTop: 12 }}
          >
            + إضافة بند
          </button>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
              gap: 16,
              marginTop: 20,
            }}
          >
            <label>
              <strong>الخصم بالجنيه</strong>
              <input
                type="number"
                min="0"
                step="0.01"
                value={latest.discount}
                onChange={(event) =>
                  patchLatest({ discount: Number(event.target.value) })
                }
                style={{ display: "block", width: "100%", marginTop: 8 }}
              />
            </label>
            <label>
              <strong>ملاحظات المقايسة</strong>
              <textarea
                value={latest.notes || ""}
                onChange={(event) => patchLatest({ notes: event.target.value })}
                rows={3}
                style={{ display: "block", width: "100%", marginTop: 8 }}
              />
            </label>
          </div>

          <div style={{ marginTop: 20, textAlign: "right" }}>
            <p>الإجمالي قبل الخصم: <strong>{money(calculatedSubtotal)} ج</strong></p>
            <p>الخصم: <strong>{money(Number(latest.discount || 0))} ج</strong></p>
            <h3>الإجمالي النهائي: {money(calculatedTotal)} ج</h3>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 16,
            }}
          >
            <button className="ghostBtn" disabled={busy} onClick={() => void saveDraft()}>
              حفظ المسودة
            </button>
            <button className="button" disabled={busy} onClick={sendToCustomer}>
              تثبيت وإرسال للعميل
            </button>
          </div>
        </div>
      )}

      {latest && latest.status !== "DRAFT" && (
        <div style={{ marginTop: 18 }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 700 }}>
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
                {latest.items.map((item, index) => (
                  <tr key={item.id || index}>
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

          <div style={{ marginTop: 18 }}>
            <p>الإجمالي قبل الخصم: {money(latest.subtotal)} ج</p>
            <p>الخصم: {money(latest.discount)} ج</p>
            <h3>الإجمالي النهائي: {money(latest.total)} ج</h3>
            {latest.notes && <p>ملاحظات: {latest.notes}</p>}
          </div>

          {latest.status === "ACCEPTED" && (
            <div className="successBox" style={{ marginTop: 14 }}>
              هذه المقايسة معتمدة من العميل، وتم تحديث السعر النهائي والفاتورة على إجماليها.
            </div>
          )}

          {approvalUrl && latest.status === "SENT" && (
            <div style={{ marginTop: 16 }}>
              <strong>رابط موافقة العميل</strong>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                  marginTop: 8,
                }}
              >
                <input
                  readOnly
                  value={approvalUrl}
                  style={{ flex: 1, minWidth: 280 }}
                />
                <button className="ghostBtn" onClick={copyApprovalLink}>
                  نسخ الرابط
                </button>
              </div>
            </div>
          )}

          <button
            className="button"
            disabled={busy}
            onClick={createNewVersion}
            style={{ marginTop: 18 }}
          >
            إنشاء إصدار جديد للتعديل
          </button>
        </div>
      )}

      {estimates.length > 1 && (
        <div style={{ marginTop: 26 }}>
          <h3>سجل إصدارات المقايسة</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {estimates.map((estimate) => (
              <div
                key={estimate.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: 12,
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  flexWrap: "wrap",
                }}
              >
                <span>
                  V{estimate.version} — {statusLabels[estimate.status]}
                </span>
                <strong>{money(estimate.total)} ج</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
