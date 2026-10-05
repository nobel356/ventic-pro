"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";

type Snapshot = {
  order: {
    id: string;
    orderNo: string;
    status: string;
    customerName: string;
    customerPhoneMasked: string;
    technicianName: string | null;
  };
  photos: {
    customer: number;
    before: number;
    after: number;
    customerItems: Array<{
      id: string;
      fileName: string;
      href: string;
      createdAt: string;
    }>;
    beforeItems: Array<{
      id: string;
      fileName: string;
      href: string;
      createdAt: string;
    }>;
    afterItems: Array<{
      id: string;
      fileName: string;
      href: string;
      createdAt: string;
    }>;
  };
  materials: {
    confirmed: boolean;
    confirmedNone: boolean;
    items: Array<{
      id: string;
      sku: string;
      nameAr: string;
      unit: string;
      balance: number;
    }>;
    usage: Array<{
      id: string;
      itemName: string;
      sku: string;
      unit: string;
      quantity: number;
      note: string;
      createdAt: string;
    }>;
  };
  finance: {
    authoritative: boolean;
    source: string;
    total: number;
    paid: number;
    due: number;
  };
  otp: {
    active: boolean;
    expiresAt: string | null;
    resendAfterSeconds: number;
    stagingVisible: boolean;
  };
};


async function prepareUploadImage(
  file: File,
) {
  const maxBytes =
    3.5 * 1024 * 1024;
  const maxDimension = 1800;

  if (
    file.size <= maxBytes &&
    ["image/jpeg", "image/png", "image/webp"].includes(
      file.type,
    )
  ) {
    return file;
  }

  const url =
    URL.createObjectURL(file);

  try {
    const image =
      await new Promise<HTMLImageElement>(
        (resolve, reject) => {
          const img =
            new Image();
          img.onload = () =>
            resolve(img);
          img.onerror = reject;
          img.src = url;
        },
      );

    const scale = Math.min(
      1,
      maxDimension /
        Math.max(
          image.width,
          image.height,
        ),
    );

    const canvas =
      document.createElement(
        "canvas",
      );
    canvas.width = Math.max(
      1,
      Math.round(
        image.width * scale,
      ),
    );
    canvas.height = Math.max(
      1,
      Math.round(
        image.height * scale,
      ),
    );

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return file;

    ctx.drawImage(
      image,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    for (const quality of [
      0.84, 0.74, 0.64,
    ]) {
      const blob =
        await new Promise<Blob | null>(
          (resolve) =>
            canvas.toBlob(
              resolve,
              "image/jpeg",
              quality,
            ),
        );

      if (
        blob &&
        blob.size <= maxBytes
      ) {
        const base =
          file.name.replace(
            /\.[^.]+$/,
            "",
          ) || "photo";

        return new File(
          [blob],
          `${base}.jpg`,
          {
            type: "image/jpeg",
            lastModified:
              Date.now(),
          },
        );
      }
    }

    throw new Error(
      "الصورة كبيرة جدًا. حاول التصوير بدقة أقل.",
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function ExecutionWorkspace({
  orderId,
  apiBase,
  backHref,
  title,
  adminMode = false,
}: {
  orderId: string;
  apiBase: string;
  backHref: string;
  title: string;
  adminMode?: boolean;
}) {
  const router = useRouter();
  const [snapshot, setSnapshot] =
    useState<Snapshot | null>(null);
  const [before, setBefore] =
    useState<File | null>(null);
  const [after, setAfter] =
    useState<File | null>(null);
  const [itemId, setItemId] =
    useState("");
  const [quantity, setQuantity] =
    useState("");
  const [materialNote, setMaterialNote] =
    useState("");
  const [otp, setOtp] = useState("");
  const [stagingOtp, setStagingOtp] =
    useState("");
  const [countdown, setCountdown] =
    useState(0);
  const [deliveryText, setDeliveryText] =
    useState("");
  const [loading, setLoading] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const [error, setError] =
    useState("");

  async function load() {
    try {
      const response = await fetch(
        apiBase,
        { cache: "no-store" },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر تحميل شاشة التنفيذ",
        );
      }

      setSnapshot(data);
      setCountdown(
        Number(
          data?.otp
            ?.resendAfterSeconds || 0,
        ),
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر تحميل شاشة التنفيذ",
      );
    }
  }

  useEffect(() => {
    void load();
  }, [apiBase]);

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = window.setInterval(
      () =>
        setCountdown((value) =>
          Math.max(0, value - 1),
        ),
      1000,
    );

    return () =>
      window.clearInterval(timer);
  }, [countdown > 0]);

  function resetAlerts() {
    setMessage("");
    setError("");
  }

  async function upload(
    kind: "BEFORE" | "AFTER",
    file: File | null,
  ) {
    resetAlerts();

    if (!file) {
      setError("اختر صورة أولًا.");
      return;
    }

    setLoading(true);

    try {
      const prepared =
        await prepareUploadImage(
          file,
        );
      const form = new FormData();
      form.append("kind", kind);
      form.append("file", prepared);

      const response = await fetch(
        `${apiBase}?action=attachment`,
        {
          method: "POST",
          body: form,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error);
      }

      setMessage(
        kind === "BEFORE"
          ? "تم تسجيل صورة قبل التركيب."
          : "تم تسجيل صورة بعد التركيب.",
      );
      await load();
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر رفع الصورة",
      );
    } finally {
      setLoading(false);
    }
  }

  async function recordMaterial() {
    resetAlerts();

    const numeric = Number(quantity);

    if (
      !itemId ||
      !Number.isFinite(numeric) ||
      numeric <= 0
    ) {
      setError(
        "اختر الخامة واكتب الكمية.",
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${apiBase}?action=material`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            itemId,
            quantity: numeric,
            note: materialNote,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error);
      }

      setQuantity("");
      setMaterialNote("");
      setMessage(
        "تم تسجيل الخامة وخصمها تلقائيًا من عهدة الفني وربطها بالأوردر.",
      );
      await load();
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر تسجيل الخامة",
      );
    } finally {
      setLoading(false);
    }
  }

  async function confirmNoMaterials() {
    resetAlerts();
    setLoading(true);

    try {
      const response = await fetch(
        `${apiBase}?action=confirm-none`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: "{}",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error);
      }

      setMessage(
        "تم تأكيد عدم استخدام خامات.",
      );
      await load();
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر تأكيد الخامات",
      );
    } finally {
      setLoading(false);
    }
  }

  async function issueOtp() {
    resetAlerts();
    setStagingOtp("");
    setDeliveryText("");
    setLoading(true);

    try {
      const response = await fetch(
        `${apiBase}?action=otp`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: "{}",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        if (data?.retryAfterSeconds) {
          setCountdown(
            Number(
              data.retryAfterSeconds,
            ),
          );
        }
        throw new Error(data?.error);
      }

      setCountdown(
        Number(
          data?.resendAfterSeconds || 60,
        ),
      );
      setStagingOtp(
        String(data?.stagingOtp || ""),
      );
      setDeliveryText(
        data?.delivery?.sent
          ? `تم الإرسال إلى ${data.delivery.destinationMasked} عبر ${
              data.delivery.channel ===
              "WHATSAPP"
                ? "WhatsApp"
                : "SMS"
            }.`
          : "خدمة الرسائل غير مفعلة حاليًا — وضع التجربة يعمل.",
      );
      setMessage(data?.message || "تم إصدار الكود.");
      await load();
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر إصدار الكود",
      );
    } finally {
      setLoading(false);
    }
  }

  async function complete() {
    resetAlerts();
    setLoading(true);

    try {
      const response = await fetch(
        `${apiBase}?action=complete`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            otp,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error);
      }

      setMessage(
        `تم إغلاق الطلب بنجاح. تم تحديث الفاتورة وتفعيل الضمان حتى ${new Date(
          data.warrantyEndsAt,
        ).toLocaleDateString("ar-EG")}.`,
      );

      window.setTimeout(() => {
        router.push(backHref);
        router.refresh();
      }, 1200);
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر إتمام الطلب",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!snapshot) {
    return (
      <section style={panelStyle}>
        {error ||
          "جاري تحميل شاشة التنفيذ..."}
      </section>
    );
  }

  const photosDone =
    snapshot.photos.before > 0 &&
    snapshot.photos.after > 0;
  const materialsDone =
    snapshot.materials.confirmed;
  const quoteDone =
    snapshot.finance.authoritative;
  const otpReady =
    photosDone &&
    materialsDone &&
    quoteDone;

  return (
    <section
      style={{
        maxWidth: 980,
        margin: "0 auto",
        display: "grid",
        gap: 16,
      }}
      dir="rtl"
    >
      <div style={panelStyle}>
        <div style={topStyle}>
          <div>
            <h1 style={{ margin: 0 }}>
              {title}
            </h1>
            <p style={mutedStyle}>
              {snapshot.order.orderNo} —{" "}
              {snapshot.order.customerName}
              {snapshot.order.technicianName
                ? ` — الفني: ${snapshot.order.technicianName}`
                : ""}
            </p>
          </div>

          <Link
            href={backHref}
            style={backStyle}
          >
            رجوع
          </Link>
        </div>

        {adminMode && (
          <div style={adminNoticeStyle}>
            وضع متابعة المدير: أي إجراء هنا يُسجل باسم الحساب الحالي في الـAudit Log، بينما الخامات تخصم من عهدة الفني المعين على الطلب.
          </div>
        )}

        <div style={stepsStyle}>
          <StatusCard
            label="مقايسة معتمدة"
            done={quoteDone}
            detail={
              quoteDone
                ? `الإجمالي ${snapshot.finance.total.toLocaleString(
                    "ar-EG",
                  )} ج`
                : "اعتماد مقايسة Ventic Pro مطلوب"
            }
          />
          <StatusCard
            label="صورة قبل"
            done={
              snapshot.photos.before > 0
            }
            detail={`${snapshot.photos.before} صورة`}
          />
          <StatusCard
            label="الخامات"
            done={materialsDone}
            detail={
              snapshot.materials
                .confirmedNone
                ? "لا توجد خامات"
                : `${snapshot.materials.usage.length} حركة استخدام`
            }
          />
          <StatusCard
            label="صورة بعد"
            done={
              snapshot.photos.after > 0
            }
            detail={`${snapshot.photos.after} صورة`}
          />
        </div>
      </div>

      {snapshot.photos.customer > 0 && (
        <div style={panelStyle}>
          <h2 style={{ marginTop: 0 }}>
            صور العميل قبل الزيارة
          </h2>
          <p style={mutedStyle}>
            الصور دي رفعها العميل أثناء إنشاء الطلب، ومتصلة بنفس الأوردر.
          </p>
          <div style={photoLinksStyle}>
            {snapshot.photos.customerItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                style={photoLinkStyle}
              >
                عرض {item.fileName}
              </a>
            ))}
          </div>
        </div>
      )}

      <div style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>
          1. صورة قبل التركيب
        </h2>
        <p style={mutedStyle}>
          المسجل حاليًا:{" "}
          {snapshot.photos.before}
        </p>
        {snapshot.photos.beforeItems.length > 0 && (
          <div style={photoLinksStyle}>
            {snapshot.photos.beforeItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                style={photoLinkStyle}
              >
                عرض {item.fileName}
              </a>
            ))}
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(event) =>
            setBefore(
              event.target.files?.[0] ||
                null,
            )
          }
        />
        <button
          type="button"
          disabled={loading}
          onClick={() =>
            void upload("BEFORE", before)
          }
          style={secondaryButtonStyle}
        >
          تسجيل صورة قبل
        </button>
      </div>

      <div style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>
          2. الخامات المستخدمة
        </h2>
        <p style={mutedStyle}>
          تسجل مرة واحدة هنا فتخصم من عهدة الفني وتظهر داخل الأوردر والمخزون والتقارير.
        </p>

        {snapshot.materials.usage.length >
          0 && (
          <div style={usageListStyle}>
            {snapshot.materials.usage.map(
              (item) => (
                <div
                  key={item.id}
                  style={usageStyle}
                >
                  <strong>
                    {item.sku} —{" "}
                    {item.itemName}
                  </strong>
                  <span>
                    {item.quantity}{" "}
                    {item.unit}
                  </span>
                  <small>
                    {item.note ||
                      "بدون ملاحظة"}
                  </small>
                </div>
              ),
            )}
          </div>
        )}

        {snapshot.materials
          .confirmedNone ? (
          <div style={successInlineStyle}>
            تم تأكيد عدم استخدام خامات.
          </div>
        ) : (
          <>
            <div style={materialGridStyle}>
              <select
                value={itemId}
                onChange={(event) =>
                  setItemId(
                    event.target.value,
                  )
                }
                style={inputStyle}
              >
                <option value="">
                  اختر من عهدة الفني
                </option>
                {snapshot.materials.items.map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.sku} —{" "}
                      {item.nameAr} — متاح{" "}
                      {item.balance}{" "}
                      {item.unit}
                    </option>
                  ),
                )}
              </select>

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(event) =>
                  setQuantity(
                    event.target.value,
                  )
                }
                placeholder="الكمية"
                style={inputStyle}
              />

              <input
                value={materialNote}
                onChange={(event) =>
                  setMaterialNote(
                    event.target.value,
                  )
                }
                placeholder="ملاحظة اختيارية"
                style={inputStyle}
              />

              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  void recordMaterial()
                }
                className="button"
              >
                تسجيل الخامة
              </button>
            </div>

            {snapshot.materials.usage
              .length === 0 && (
              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  void confirmNoMaterials()
                }
                style={{
                  ...secondaryButtonStyle,
                  marginTop: 10,
                }}
              >
                لم يتم استخدام خامات
              </button>
            )}
          </>
        )}
      </div>

      <div style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>
          3. صورة بعد التركيب
        </h2>
        <p style={mutedStyle}>
          المسجل حاليًا:{" "}
          {snapshot.photos.after}
        </p>
        {snapshot.photos.afterItems.length > 0 && (
          <div style={photoLinksStyle}>
            {snapshot.photos.afterItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                style={photoLinkStyle}
              >
                عرض {item.fileName}
              </a>
            ))}
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(event) =>
            setAfter(
              event.target.files?.[0] ||
                null,
            )
          }
        />
        <button
          type="button"
          disabled={loading}
          onClick={() =>
            void upload("AFTER", after)
          }
          style={secondaryButtonStyle}
        >
          تسجيل صورة بعد
        </button>
      </div>

      <div style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>
          4. كود تأكيد العميل OTP
        </h2>

        {!quoteDone && (
          <div style={warningStyle}>
            يجب اعتماد مقايسة Ventic Pro قبل إصدار كود الإتمام.
          </div>
        )}

        {!photosDone && (
          <div style={warningStyle}>
            يجب تسجيل صور قبل وبعد.
          </div>
        )}

        {!materialsDone && (
          <div style={warningStyle}>
            يجب تسجيل الخامات أو تأكيد عدم استخدامها.
          </div>
        )}

        <button
          type="button"
          disabled={
            loading ||
            !otpReady ||
            countdown > 0
          }
          onClick={() =>
            void issueOtp()
          }
          className="button"
        >
          {countdown > 0
            ? `إعادة الإرسال بعد ${countdown} ث`
            : snapshot.otp.active
              ? "إعادة إرسال كود جديد"
              : "إصدار وإرسال كود OTP"}
        </button>

        {deliveryText && (
          <p style={mutedStyle}>
            {deliveryText}
          </p>
        )}

        {stagingOtp && (
          <div style={stagingBoxStyle}>
            <div>
              <strong>
                وضع التجربة — الكود:
              </strong>
              <div style={otpCodeStyle}>
                {stagingOtp}
              </div>
              <small>
                هذا الكود يظهر فقط في بيئة غير Production عند تفعيل OTP_STAGING_VISIBLE.
              </small>
            </div>

            <button
              type="button"
              onClick={() =>
                setOtp(stagingOtp)
              }
              style={secondaryButtonStyle}
            >
              استخدام كود التجربة
            </button>
          </div>
        )}

        <input
          inputMode="numeric"
          maxLength={6}
          value={otp}
          onChange={(event) =>
            setOtp(
              event.target.value.replace(
                /\D/g,
                "",
              ),
            )
          }
          placeholder="أدخل كود العميل المكون من 6 أرقام"
          style={{
            ...inputStyle,
            marginTop: 12,
          }}
        />

        <button
          type="button"
          disabled={
            loading || otp.length !== 6
          }
          onClick={() =>
            void complete()
          }
          style={{
            ...completeButtonStyle,
            marginTop: 10,
          }}
        >
          تأكيد وإتمام التركيب
        </button>
      </div>

      {message && (
        <div style={successStyle}>
          {message}
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

function StatusCard({
  label,
  detail,
  done,
}: {
  label: string;
  detail: string;
  done: boolean;
}) {
  return (
    <div
      style={{
        border: `1px solid ${
          done
            ? "#bbf7d0"
            : "#fed7aa"
        }`,
        background: done
          ? "#f0fdf4"
          : "#fff7ed",
        borderRadius: 12,
        padding: 11,
      }}
    >
      <strong
        style={{
          display: "block",
          color: done
            ? "#166534"
            : "#9a3412",
        }}
      >
        {done ? "✓" : "•"} {label}
      </strong>
      <small
        style={{
          color: "#64748b",
        }}
      >
        {detail}
      </small>
    </div>
  );
}

const panelStyle: CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 18,
  boxShadow:
    "0 8px 24px rgba(15,23,42,.05)",
};

const topStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
};

const mutedStyle: CSSProperties = {
  color: "#64748b",
  lineHeight: 1.6,
  marginBottom: 0,
};

const stepsStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(150px,1fr))",
  gap: 8,
  marginTop: 16,
};

const materialGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(160px,1fr))",
  gap: 8,
  marginTop: 12,
};

const inputStyle: CSSProperties = {
  minHeight: 44,
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "0 11px",
  background: "white",
  boxSizing: "border-box",
  font: "inherit",
};

const secondaryButtonStyle: CSSProperties = {
  minHeight: 40,
  width: "fit-content",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  background: "white",
  color: "#0f2d4a",
  padding: "0 13px",
  fontWeight: 800,
  cursor: "pointer",
};

const completeButtonStyle: CSSProperties = {
  minHeight: 44,
  width: "100%",
  border: 0,
  borderRadius: 10,
  background: "#0f2d4a",
  color: "white",
  padding: "0 14px",
  fontWeight: 900,
  cursor: "pointer",
};

const backStyle: CSSProperties = {
  textDecoration: "none",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "8px 12px",
  color: "#0f2d4a",
  fontWeight: 800,
};

const usageListStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  marginTop: 12,
};

const usageStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "minmax(160px,1fr) auto",
  gap: 8,
  border: "1px solid #dbeafe",
  borderRadius: 10,
  padding: 10,
  background: "#f8fbff",
};

const adminNoticeStyle: CSSProperties = {
  marginTop: 14,
  padding: 11,
  borderRadius: 10,
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1e3a8a",
  lineHeight: 1.6,
};

const warningStyle: CSSProperties = {
  marginTop: 8,
  padding: 10,
  borderRadius: 10,
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  color: "#9a3412",
};

const successInlineStyle: CSSProperties = {
  marginTop: 10,
  padding: 10,
  borderRadius: 10,
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  color: "#166534",
};

const stagingBoxStyle: CSSProperties = {
  marginTop: 12,
  padding: 14,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
  borderRadius: 12,
  background: "#fffbeb",
  border: "1px solid #fde68a",
  color: "#92400e",
};

const otpCodeStyle: CSSProperties = {
  fontSize: 28,
  fontWeight: 900,
  letterSpacing: 5,
  margin: "6px 0",
  direction: "ltr",
};

const photoLinksStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginBottom: 10,
};

const photoLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 34,
  border: "1px solid #bfdbfe",
  borderRadius: 9,
  padding: "0 10px",
  textDecoration: "none",
  color: "#1d4ed8",
  background: "#eff6ff",
  fontWeight: 800,
  fontSize: 13,
};

const successStyle: CSSProperties = {
  padding: 12,
  borderRadius: 10,
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  color: "#166534",
};

const errorStyle: CSSProperties = {
  padding: 12,
  borderRadius: 10,
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
};
