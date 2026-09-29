"use client";

import { useEffect, useMemo, useState } from "react";

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
  lineTotal?: number;
  sortOrder?: number;
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
  sentAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  approvalPath: string;
  items: EstimateItem[];
};

const statusLabels: Record<EstimateStatus, string> = {
  DRAFT: "مسودة",
  SENT: "مرسلة للعميل",
  ACCEPTED: "معتمدة",
  REJECTED: "مرفوضة",
  SUPERSEDED: "تم استبدالها",
};

function money(value: number) {
  return Number(value || 0).toLocaleString("ar-EG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export default function VenticEstimateEditor({
  orderId,
}: {
  orderId: string;
}) {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const active =
    estimates.find((estimate) => estimate.id === selectedId) ||
    estimates[0] ||
    null;

  async function loadEstimates(preferId?: string) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/ventic-estimates?orderId=${encodeURIComponent(orderId)}`,
        { cache: "no-store" },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر تحميل مقايسات Ventic Pro");
      }

      const next = data as Estimate[];
      setEstimates(next);

      if (preferId && next.some((estimate) => estimate.id === preferId)) {
        setSelectedId(preferId);
      } else {
        setSelectedId(next[0]?.id || "");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "تعذر تحميل مقايسات Ventic Pro",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEstimates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    if (!active) {
      setItems([]);
      setDiscount(0);
      setNotes("");
      return;
    }

    setItems(
      active.items.map((item) => ({
        ...item,
        qty: Number(item.qty),
        unitPrice: Number(item.unitPrice),
      })),
    );
    setDiscount(Number(active.discount || 0));
    setNotes(active.notes || "");
    setMessage("");
    setError("");
  }, [active?.id]);

  const draftSubtotal = useMemo(
    () =>
      roundMoney(
        items.reduce(
          (sum, item) =>
            sum + Number(item.qty || 0) * Number(item.unitPrice || 0),
          0,
        ),
      ),
    [items],
  );

  const draftTotal = useMemo(
    () => roundMoney(Math.max(0, draftSubtotal - Number(discount || 0))),
    [draftSubtotal, discount],
  );

  async function post(body: Record<string, unknown>) {
    const response = await fetch("/api/admin/ventic-estimates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "تعذر تنفيذ العملية");
    }

    return data;
  }

  async function createFromCustomer() {
    setWorking(true);
    setMessage("");
    setError("");

    try {
      const created = (await post({
        action: "create",
        orderId,
      })) as Estimate;

      await loadEstimates(created.id);
      setMessage("تم إنشاء مقايسة Ventic Pro من مقايسة العميل.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إنشاء المقايسة");
    } finally {
      setWorking(false);
    }
  }

  function updateItem(
    index: number,
    field: keyof Pick<
      EstimateItem,
      "description" | "unit" | "qty" | "unitPrice"
    >,
    value: string,
  ) {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        if (field === "qty" || field === "unitPrice") {
          return {
            ...item,
            [field]: Number(value),
          };
        }

        return {
          ...item,
          [field]: value,
        };
      }),
    );
  }

  function addItem() {
    setItems((current) => [
      ...current,
      {
        description: "",
        unit: "وحدة",
        qty: 1,
        unitPrice: 0,
      },
    ]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) {
      setError("المقايسة يجب أن تحتوي على بند واحد على الأقل.");
      return;
    }

    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function saveDraft(showSuccess = true): Promise<Estimate> {
    if (!active || active.status !== "DRAFT") {
      throw new Error("المقايسة الحالية ليست مسودة قابلة للتعديل.");
    }

    const updated = (await post({
      action: "save",
      estimateId: active.id,
      items: items.map((item) => ({
        description: item.description,
        unit: item.unit,
        qty: Number(item.qty),
        unitPrice: Number(item.unitPrice),
      })),
      discount: Number(discount),
      notes,
    })) as Estimate;

    setEstimates((current) =>
      current
        .map((estimate) => (estimate.id === updated.id ? updated : estimate))
        .sort((a, b) => b.version - a.version),
    );
    setSelectedId(updated.id);

    if (showSuccess) {
      setMessage("تم حفظ مسودة المقايسة.");
    }

    return updated;
  }

  async function handleSave() {
    setWorking(true);
    setMessage("");
    setError("");

    try {
      await saveDraft(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ المقايسة");
    } finally {
      setWorking(false);
    }
  }

  async function handleSend() {
    setWorking(true);
    setMessage("");
    setError("");

    try {
      const saved = await saveDraft(false);
      const result = (await post({
        action: "send",
        estimateId: saved.id,
      })) as {
        estimate: Estimate;
        approvalPath: string;
      };

      const sent = result.estimate;

      setEstimates((current) =>
        current
          .map((estimate) => (estimate.id === sent.id ? sent : estimate))
          .sort((a, b) => b.version - a.version),
      );
      setSelectedId(sent.id);

      const approvalUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}${result.approvalPath}`
          : result.approvalPath;

      setMessage(`تم إرسال المقايسة. رابط العميل: ${approvalUrl}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إرسال المقايسة");
    } finally {
      setWorking(false);
    }
  }

  async function createNewVersion() {
    if (!active) return;

    setWorking(true);
    setMessage("");
    setError("");

    try {
      const created = (await post({
        action: "newVersion",
        estimateId: active.id,
      })) as Estimate;

      await loadEstimates(created.id);
      setMessage(`تم إنشاء الإصدار ${created.version} كمسودة جديدة.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "تعذر إنشاء إصدار جديد",
      );
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return (
      <div className="adminQuick" style={{ marginTop: 24 }}>
        <h2>مقايسة Ventic Pro النهائية</h2>
        <p>جاري تحميل المقايسة...</p>
      </div>
    );
  }

  if (estimates.length === 0) {
    return (
      <div
        className="adminQuick"
        style={{
          marginTop: 24,
          border: "2px solid #dbeafe",
          borderRadius: 16,
          padding: 20,
        }}
      >
        <h2>مقايسة Ventic Pro النهائية</h2>
        <p>
          مقايسة العميل الأصلية تظل كما هي. أنشئ منها مقايسة Ventic Pro مستقلة
          لتعديل البنود والأسعار قبل اعتماد العميل.
        </p>

        {error && (
          <p style={{ color: "#b91c1c", fontWeight: 700 }}>{error}</p>
        )}

        <button
          type="button"
          className="button"
          onClick={createFromCustomer}
          disabled={working}
        >
          {working
            ? "جاري الإنشاء..."
            : "إنشاء مقايسة Ventic Pro من مقايسة العميل"}
        </button>
      </div>
    );
  }

  if (!active) return null;

  const editable = active.status === "DRAFT";
  const shownSubtotal = editable ? draftSubtotal : active.subtotal;
  const shownDiscount = editable ? Number(discount || 0) : active.discount;
  const shownTotal = editable ? draftTotal : active.total;
  const approvalUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${active.approvalPath}`
      : active.approvalPath;

  return (
    <div
      className="adminQuick"
      style={{
        marginTop: 24,
        border: "2px solid #dbeafe",
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ marginBottom: 6 }}>مقايسة Ventic Pro النهائية</h2>
          <p style={{ marginTop: 0 }}>
            الإصدار {active.version} — {statusLabels[active.status]}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {estimates.map((estimate) => (
            <button
              type="button"
              key={estimate.id}
              onClick={() => setSelectedId(estimate.id)}
              style={{
                border:
                  estimate.id === active.id
                    ? "2px solid #0f3b64"
                    : "1px solid #d1d5db",
                borderRadius: 10,
                padding: "8px 12px",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              إصدار {estimate.version} — {statusLabels[estimate.status]}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            background: "#ecfdf5",
            borderRadius: 10,
            overflowWrap: "anywhere",
          }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            background: "#fef2f2",
            color: "#b91c1c",
            borderRadius: 10,
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      )}

      {active.status === "ACCEPTED" && (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            background: "#ecfdf5",
            borderRadius: 10,
            fontWeight: 700,
          }}
        >
          هذه هي المقايسة المعتمدة. السعر النهائي والفاتورة يعتمدان إجمالي هذا
          الإصدار.
        </div>
      )}

      <div style={{ overflowX: "auto", marginTop: 18 }}>
        <table style={{ width: "100%", minWidth: 800 }}>
          <thead>
            <tr>
              <th>البيان</th>
              <th>الكمية</th>
              <th>الوحدة</th>
              <th>سعر الوحدة</th>
              <th>الإجمالي</th>
              {editable && <th>حذف</th>}
            </tr>
          </thead>

          <tbody>
            {items.map((item, index) => {
              const lineTotal = roundMoney(
                Number(item.qty || 0) * Number(item.unitPrice || 0),
              );

              return (
                <tr key={item.id || `new-${index}`}>
                  <td style={{ minWidth: 260 }}>
                    {editable ? (
                      <input
                        value={item.description}
                        onChange={(event) =>
                          updateItem(
                            index,
                            "description",
                            event.target.value,
                          )
                        }
                        style={{ width: "100%", padding: 8 }}
                        placeholder="وصف البند"
                      />
                    ) : (
                      item.description
                    )}
                  </td>

                  <td style={{ minWidth: 100 }}>
                    {editable ? (
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.qty}
                        onChange={(event) =>
                          updateItem(index, "qty", event.target.value)
                        }
                        style={{ width: 90, padding: 8 }}
                      />
                    ) : (
                      item.qty
                    )}
                  </td>

                  <td style={{ minWidth: 100 }}>
                    {editable ? (
                      <input
                        value={item.unit}
                        onChange={(event) =>
                          updateItem(index, "unit", event.target.value)
                        }
                        style={{ width: 100, padding: 8 }}
                      />
                    ) : (
                      item.unit
                    )}
                  </td>

                  <td style={{ minWidth: 130 }}>
                    {editable ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(event) =>
                          updateItem(
                            index,
                            "unitPrice",
                            event.target.value,
                          )
                        }
                        style={{ width: 120, padding: 8 }}
                      />
                    ) : (
                      `${money(item.unitPrice)} ج`
                    )}
                  </td>

                  <td style={{ fontWeight: 700 }}>
                    {money(lineTotal)} ج
                  </td>

                  {editable && (
                    <td>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        style={{
                          border: "1px solid #fecaca",
                          color: "#b91c1c",
                          background: "#fff",
                          borderRadius: 8,
                          padding: "7px 10px",
                          cursor: "pointer",
                        }}
                      >
                        حذف
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editable && (
        <button
          type="button"
          onClick={addItem}
          style={{
            marginTop: 12,
            border: "1px dashed #0f3b64",
            borderRadius: 10,
            padding: "9px 14px",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          + إضافة بند
        </button>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginTop: 20,
        }}
      >
        <div
          style={{
            padding: 14,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
          }}
        >
          <strong>الإجمالي قبل الخصم</strong>
          <h3>{money(shownSubtotal)} ج</h3>
        </div>

        <div
          style={{
            padding: 14,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
          }}
        >
          <strong>الخصم</strong>
          {editable ? (
            <input
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(event) => setDiscount(Number(event.target.value))}
              style={{
                width: "100%",
                marginTop: 8,
                padding: 8,
              }}
            />
          ) : (
            <h3>{money(shownDiscount)} ج</h3>
          )}
        </div>

        <div
          style={{
            padding: 14,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
          }}
        >
          <strong>الإجمالي النهائي</strong>
          <h3>{money(shownTotal)} ج</h3>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <strong>ملاحظات المقايسة</strong>
        {editable ? (
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            style={{
              width: "100%",
              marginTop: 8,
              padding: 10,
              resize: "vertical",
            }}
            placeholder="ملاحظات تظهر مع المقايسة..."
          />
        ) : (
          <p>{active.notes || "لا توجد ملاحظات."}</p>
        )}
      </div>

      {active.status !== "DRAFT" && (
        <div
          style={{
            marginTop: 18,
            padding: 12,
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            overflowWrap: "anywhere",
          }}
        >
          <strong>رابط مراجعة العميل:</strong>
          <div style={{ marginTop: 6 }}>
            <a href={active.approvalPath} target="_blank" rel="noreferrer">
              {approvalUrl}
            </a>
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginTop: 20,
        }}
      >
        {editable ? (
          <>
            <button
              type="button"
              className="ghostBtn"
              onClick={handleSave}
              disabled={working}
            >
              حفظ المسودة
            </button>
            <button
              type="button"
              className="button"
              onClick={handleSend}
              disabled={working}
            >
              {working ? "جاري التنفيذ..." : "حفظ وإرسال للعميل"}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="button"
            onClick={createNewVersion}
            disabled={working}
          >
            {working ? "جاري الإنشاء..." : "إنشاء إصدار جديد للتعديل"}
          </button>
        )}
      </div>
    </div>
  );
}
