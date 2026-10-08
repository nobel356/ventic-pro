"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

const statuses = {
  NEW: "جديد",
  CONFIRMED: "تم التأكيد",
  ASSIGNED: "تم تعيين فني",
  ON_THE_WAY: "في الطريق",
  ARRIVED: "وصل",
  IN_PROGRESS: "جاري التنفيذ",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
};

const standardTimes = [
  "10 ص - 1 م",
  "1 م - 4 م",
  "4 م - 7 م",
  "7 م - 10 م",
];

export default function OrderActions({
  orderId,
  currentStatus,
  technicianId,
  preferredDate,
  preferredTime,
  technicians,
}: {
  orderId: string;
  currentStatus: string;
  technicianId?: string | null;
  preferredDate?: string | null;
  preferredTime?: string | null;
  technicians: {
    id: string;
    name: string;
  }[];
}) {
  const router = useRouter();
  const [loading, setLoading] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const [messageError, setMessageError] =
    useState(false);
  const [date, setDate] =
    useState(
      preferredDate || "",
    );
  const [time, setTime] =
    useState(
      preferredTime || "",
    );
  const [
    canArchive,
    setCanArchive,
  ] = useState(false);
  const [
    archiveReason,
    setArchiveReason,
  ] = useState("");

  const completed =
    currentStatus ===
    "COMPLETED";

  useEffect(() => {
    let active = true;

    void fetch(
      "/api/admin/archive/status",
      { cache: "no-store" },
    )
      .then((response) =>
        response.json(),
      )
      .then((data) => {
        if (active) {
          setCanArchive(
            Boolean(
              data?.canArchive,
            ),
          );
        }
      })
      .catch(() => {
        if (active) {
          setCanArchive(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function request(
    url: string,
    body: any,
    successMessage =
      "تم الحفظ بنجاح",
  ) {
    setLoading(true);
    setMessage("");
    setMessageError(false);

    try {
      const res =
        await fetch(url, {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            body,
          ),
        });
      const data =
        await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "حدث خطأ",
        );
      }

      setMessage(
        successMessage,
      );
      setMessageError(false);
      router.refresh();
      return true;
    } catch (e: any) {
      setMessage(
        e.message ||
          "تعذر تنفيذ العملية",
      );
      setMessageError(true);
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function archiveOrder() {
    const reason =
      archiveReason.trim();

    if (reason.length < 3) {
      setMessageError(true);
      setMessage(
        "اكتب سبب الأرشفة أولًا.",
      );
      return;
    }

    if (
      !window.confirm(
        "سيختفي الطلب من التشغيل العادي وينتقل إلى Archive Vault. هل تريد المتابعة؟",
      )
    ) {
      return;
    }

    setLoading(true);
    setMessage("");
    setMessageError(false);

    try {
      const response =
        await fetch(
          `/api/admin/archive/orders/${orderId}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              reason,
            }),
          },
        );
      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر أرشفة الطلب.",
        );
      }

      router.push(
        "/admin/orders",
      );
      router.refresh();
    } catch (error: any) {
      setMessageError(true);
      setMessage(
        error?.message ||
          "تعذر أرشفة الطلب.",
      );
    } finally {
      setLoading(false);
    }
  }

  const hasCustomTime =
    Boolean(time) &&
    !standardTimes.includes(
      time,
    );

  const statusOptions =
    Object.entries(
      statuses,
    ).filter(
      ([value]) =>
        value !==
          "COMPLETED" ||
        currentStatus ===
          "COMPLETED",
    );

  return (
    <div
      style={{
        background: "#fff",
        border:
          "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 20,
        marginTop: 24,
      }}
    >
      <h2
        style={{
          marginTop: 0,
        }}
      >
        إدارة الطلب
      </h2>

      {completed && (
        <div
          style={{
            marginBottom: 14,
            padding: 11,
            borderRadius: 10,
            background:
              "#f0fdf4",
            border:
              "1px solid #bbf7d0",
            color: "#166534",
            fontWeight: 700,
          }}
        >
          الطلب مكتمل ومغلق تشغيليًا. بيانات الفني والميعاد محفوظة كسجل تاريخي.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(220px,1fr))",
          gap: 16,
        }}
      >
        <label>
          <strong>
            حالة الطلب
          </strong>
          <select
            disabled={
              loading ||
              completed
            }
            defaultValue={
              currentStatus
            }
            onChange={(e) =>
              void request(
                `/api/admin/orders/${orderId}`,
                {
                  status:
                    e.target
                      .value,
                },
                "تم تحديث حالة الطلب",
              )
            }
            style={fieldStyle}
          >
            {statusOptions.map(
              ([value, label]) => (
                <option
                  key={value}
                  value={value}
                >
                  {label}
                </option>
              ),
            )}
          </select>
          {!completed && (
            <small
              style={
                hintStyle
              }
            >
              الإتمام النهائي لا يتم من هنا؛ يتم من شاشة الفني بعد صور قبل/بعد وتأكيد الخامات وكود العميل، حتى تعمل الفاتورة والضمان تلقائيًا.
            </small>
          )}
        </label>

        <label>
          <strong>
            الفني المسؤول
          </strong>
          <select
            disabled={
              loading ||
              completed
            }
            defaultValue={
              technicianId ||
              ""
            }
            onChange={(e) => {
              if (
                !e.target
                  .value
              ) {
                return;
              }

              void request(
                `/api/admin/orders/${orderId}/assign`,
                {
                  technicianId:
                    e.target
                      .value,
                },
                "تم تعيين الفني وإنشاء الموعد تلقائيًا في جدول الفنيين",
              );
            }}
            style={fieldStyle}
          >
            <option value="">
              غير معين
            </option>
            {technicians.map(
              (tech) => (
                <option
                  key={
                    tech.id
                  }
                  value={
                    tech.id
                  }
                >
                  {tech.name}
                </option>
              ),
            )}
          </select>
          <small
            style={hintStyle}
          >
            اختيار الفني يحجز موعد الطلب تلقائيًا بعد فحص التعارض.
          </small>
        </label>

        <label>
          <strong>
            تاريخ الموعد
          </strong>
          <input
            type="date"
            value={date}
            disabled={
              loading ||
              completed
            }
            onChange={(
              event,
            ) =>
              setDate(
                event.target
                  .value,
              )
            }
            style={fieldStyle}
          />
        </label>

        <label>
          <strong>
            فترة الموعد
          </strong>
          <select
            value={time}
            disabled={
              loading ||
              completed
            }
            onChange={(
              event,
            ) =>
              setTime(
                event.target
                  .value,
              )
            }
            style={fieldStyle}
          >
            <option value="">
              اختر الفترة
            </option>
            {hasCustomTime && (
              <option
                value={time}
              >
                {time}
              </option>
            )}
            {standardTimes.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ),
            )}
          </select>
        </label>
      </div>

      {!completed && (
        <button
          type="button"
          disabled={
            loading ||
            !date ||
            !time
          }
          onClick={() =>
            void request(
              `/api/admin/orders/${orderId}`,
              {
                preferredDate:
                  date,
                preferredTime:
                  time,
              },
              technicianId
                ? "تم تحديث الموعد وتحديث جدول الفني تلقائيًا"
                : "تم تحديث موعد الطلب",
            )
          }
          style={{
            marginTop: 16,
            border: 0,
            borderRadius: 10,
            background:
              "#0f2d4a",
            color: "white",
            minHeight: 42,
            padding:
              "0 16px",
            fontWeight: 800,
            cursor: loading
              ? "wait"
              : "pointer",
          }}
        >
          حفظ الموعد
        </button>
      )}

      {canArchive && (
        <section
          style={{
            marginTop: 22,
            paddingTop: 18,
            borderTop:
              "1px solid #e2e8f0",
          }}
        >
          <h3
            style={{
              color: "#991b1b",
              marginBottom: 6,
            }}
          >
            منطقة حساسة
          </h3>
          <p
            style={{
              color: "#64748b",
              marginTop: 0,
              lineHeight: 1.7,
            }}
          >
            نقل الطلب للأرشيف لا يمسح الفاتورة أو المدفوعات أو الصور أو الضمان أو الـAudit Log.
            الطلب يختفي من التشغيل العادي ويمكن استرجاعه لاحقًا من Archive Vault.
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
              value={
                archiveReason
              }
              onChange={(
                event,
              ) =>
                setArchiveReason(
                  event.target
                    .value,
                )
              }
              placeholder="سبب الأرشفة..."
              style={{
                ...fieldStyle,
                maxWidth: 440,
                marginTop: 0,
              }}
            />
            <button
              type="button"
              disabled={
                loading ||
                archiveReason
                  .trim()
                  .length < 3
              }
              onClick={() =>
                void archiveOrder()
              }
              style={{
                minHeight: 44,
                border:
                  "1px solid #fecaca",
                borderRadius: 10,
                background:
                  "#fef2f2",
                color: "#991b1b",
                padding:
                  "0 15px",
                fontWeight: 900,
                cursor:
                  loading
                    ? "wait"
                    : "pointer",
              }}
            >
              نقل الطلب للأرشيف
            </button>
          </div>
        </section>
      )}

      {message && (
        <p
          style={{
            marginBottom: 0,
            marginTop: 14,
            fontWeight: 700,
            color:
              messageError
                ? "#b91c1c"
                : "#166534",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 8,
  minHeight: 44,
  padding: "0 12px",
  borderRadius: 10,
  border:
    "1px solid #cbd5e1",
  boxSizing: "border-box",
  background: "white",
  font: "inherit",
};

const hintStyle: React.CSSProperties = {
  display: "block",
  color: "#64748b",
  marginTop: 6,
  lineHeight: 1.5,
};
