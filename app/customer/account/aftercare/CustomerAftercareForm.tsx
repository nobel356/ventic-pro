"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

type OrderItem = {
  id: string;
  orderNo: string;
  propertyLabel: string;
  warranty: {
    id: string;
    status: string;
    endsAt: string;
  } | null;
  devices: Array<{
    id: string;
    type: string;
    brand: string | null;
    model: string | null;
  }>;
  maintenance: Array<{
    id: string;
    issue: string;
    status: string;
    appointmentAt: string | null;
    createdAt: string;
  }>;
  complaints: Array<{
    id: string;
    issue: string;
    status: string;
    revisitAt: string | null;
    createdAt: string;
  }>;
};

export default function CustomerAftercareForm() {
  const [orders, setOrders] =
    useState<OrderItem[]>([]);
  const [kind, setKind] =
    useState("MAINTENANCE");
  const [orderId, setOrderId] =
    useState("");
  const [deviceId, setDeviceId] =
    useState("");
  const [issue, setIssue] =
    useState("");
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const [error, setError] =
    useState("");

  async function load() {
    setLoading(true);

    try {
      const response = await fetch(
        "/api/customer/aftercare",
        { cache: "no-store" },
      );
      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر تحميل بيانات ما بعد التركيب",
        );
      }

      const list: OrderItem[] =
        data?.orders || [];
      setOrders(list);

      if (
        !orderId &&
        list[0]
      ) {
        setOrderId(list[0].id);
      }
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر تحميل البيانات",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const selectedOrder =
    useMemo(
      () =>
        orders.find(
          (order) =>
            order.id === orderId,
        ) || null,
      [orders, orderId],
    );

  const tickets = useMemo(
    () =>
      orders.flatMap((order) => [
        ...order.maintenance.map(
          (ticket) => ({
            id: ticket.id,
            kind: "صيانة",
            orderNo:
              order.orderNo,
            issue: ticket.issue,
            status:
              ticket.status,
            appointment:
              ticket.appointmentAt,
            createdAt:
              ticket.createdAt,
          }),
        ),
        ...order.complaints.map(
          (ticket) => ({
            id: ticket.id,
            kind: "شكوى",
            orderNo:
              order.orderNo,
            issue: ticket.issue,
            status:
              ticket.status,
            appointment:
              ticket.revisitAt,
            createdAt:
              ticket.createdAt,
          }),
        ),
      ]),
    [orders],
  );

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (
      !orderId ||
      !issue.trim()
    ) {
      setError(
        "اختر الطلب واكتب وصف المشكلة.",
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/customer/aftercare",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            kind,
            orderId,
            deviceId:
              deviceId || null,
            issue,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر إرسال الطلب",
        );
      }

      setIssue("");
      setDeviceId("");
      setMessage(
        kind === "MAINTENANCE"
          ? "تم إرسال طلب الصيانة وربطه بالتركيب والضمان."
          : "تم تسجيل الشكوى وربطها بالطلب والفني الأصلي.",
      );
      await load();
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر إرسال الطلب",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={cardStyle}>
        جاري تحميل بياناتك...
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
      }}
    >
      <form
        onSubmit={submit}
        style={cardStyle}
      >
        <h2
          style={{
            marginTop: 0,
          }}
        >
          طلب خدمة بعد التركيب
        </h2>
        <p style={mutedStyle}>
          اختر التركيب مرة واحدة، وسيعرف النظام تلقائيًا العقار والضمان والأجهزة المرتبطة به.
        </p>

        {orders.length === 0 ? (
          <p>
            لا توجد طلبات مكتملة متاحة لما بعد التركيب.
          </p>
        ) : (
          <>
            <div style={gridStyle}>
              <label style={fieldStyle}>
                <span>نوع الطلب</span>
                <select
                  style={inputStyle}
                  value={kind}
                  onChange={(e) =>
                    setKind(
                      e.target.value,
                    )
                  }
                >
                  <option value="MAINTENANCE">
                    طلب صيانة
                  </option>
                  <option value="COMPLAINT">
                    شكوى / إعادة زيارة
                  </option>
                </select>
              </label>

              <label style={fieldStyle}>
                <span>التركيب</span>
                <select
                  style={inputStyle}
                  value={orderId}
                  onChange={(e) => {
                    setOrderId(
                      e.target.value,
                    );
                    setDeviceId("");
                  }}
                >
                  {orders.map(
                    (order) => (
                      <option
                        key={order.id}
                        value={order.id}
                      >
                        {
                          order.orderNo
                        }{" "}
                        —{" "}
                        {
                          order.propertyLabel
                        }
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label style={fieldStyle}>
                <span>
                  الجهاز (اختياري)
                </span>
                <select
                  style={inputStyle}
                  value={deviceId}
                  onChange={(e) =>
                    setDeviceId(
                      e.target.value,
                    )
                  }
                >
                  <option value="">
                    الخدمة عامة / غير محدد
                  </option>
                  {(
                    selectedOrder?.devices ||
                    []
                  ).map(
                    (device) => (
                      <option
                        key={
                          device.id
                        }
                        value={
                          device.id
                        }
                      >
                        {[
                          device.type,
                          device.brand,
                          device.model,
                        ]
                          .filter(
                            Boolean,
                          )
                          .join(
                            " — ",
                          )}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>

            {selectedOrder?.warranty && (
              <div
                style={
                  warrantyStyle
                }
              >
                الضمان:{" "}
                {
                  selectedOrder
                    .warranty.status
                }{" "}
                — حتى{" "}
                {new Date(
                  selectedOrder.warranty.endsAt,
                ).toLocaleDateString(
                  "ar-EG",
                )}
              </div>
            )}

            <label
              style={{
                ...fieldStyle,
                marginTop: 12,
              }}
            >
              <span>
                وصف المشكلة
              </span>
              <textarea
                value={issue}
                onChange={(e) =>
                  setIssue(
                    e.target.value,
                  )
                }
                rows={4}
                style={{
                  ...inputStyle,
                  padding: 10,
                  resize:
                    "vertical",
                }}
                required
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              style={{
                ...primaryButtonStyle,
                marginTop: 12,
              }}
            >
              {saving
                ? "جاري الإرسال..."
                : "إرسال الطلب"}
            </button>
          </>
        )}

        {message && (
          <div
            style={successStyle}
          >
            {message}
          </div>
        )}
        {error && (
          <div style={errorStyle}>
            {error}
          </div>
        )}
      </form>

      <section style={cardStyle}>
        <h2
          style={{
            marginTop: 0,
          }}
        >
          متابعة الطلبات السابقة
        </h2>

        {tickets.length === 0 ? (
          <p>
            لا توجد طلبات ما بعد تركيب مسجلة.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 8,
            }}
          >
            {tickets.map(
              (ticket) => (
                <div
                  key={`${ticket.kind}:${ticket.id}`}
                  style={rowStyle}
                >
                  <strong>
                    {ticket.kind} —{" "}
                    {
                      ticket.orderNo
                    }
                  </strong>
                  <span>
                    {ticket.issue}
                  </span>
                  <span>
                    {ticket.status}
                  </span>
                  <small>
                    {ticket.appointment
                      ? `الموعد: ${new Date(
                          ticket.appointment,
                        ).toLocaleString(
                          "ar-EG",
                        )}`
                      : new Date(
                          ticket.createdAt,
                        ).toLocaleDateString(
                          "ar-EG",
                        )}
                  </small>
                </div>
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}

const cardStyle: CSSProperties = {
  background: "white",
  border:
    "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 20,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(190px,1fr))",
  gap: 10,
};

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: 6,
  fontWeight: 800,
  color: "#334155",
};

const inputStyle: CSSProperties = {
  minHeight: 42,
  width: "100%",
  boxSizing: "border-box",
  border:
    "1px solid #cbd5e1",
  borderRadius: 9,
  background: "white",
  font: "inherit",
  padding: "0 10px",
};

const primaryButtonStyle: CSSProperties =
  {
    minHeight: 42,
    border: 0,
    borderRadius: 9,
    background: "#0f2d4a",
    color: "white",
    padding: "0 14px",
    fontWeight: 900,
    cursor: "pointer",
  };

const mutedStyle: CSSProperties = {
  color: "#64748b",
  lineHeight: 1.6,
};

const warrantyStyle: CSSProperties = {
  marginTop: 10,
  padding: 10,
  borderRadius: 10,
  background: "#f0fdf4",
  border:
    "1px solid #bbf7d0",
  color: "#166534",
};

const rowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "minmax(140px,.8fr) minmax(200px,1.5fr) auto auto",
  gap: 10,
  alignItems: "center",
  border:
    "1px solid #e2e8f0",
  borderRadius: 10,
  padding: 10,
  background: "#f8fafc",
};

const successStyle: CSSProperties = {
  marginTop: 12,
  padding: 10,
  borderRadius: 10,
  background: "#f0fdf4",
  border:
    "1px solid #bbf7d0",
  color: "#166534",
};

const errorStyle: CSSProperties = {
  marginTop: 12,
  padding: 10,
  borderRadius: 10,
  background: "#fef2f2",
  border:
    "1px solid #fecaca",
  color: "#991b1b",
};
