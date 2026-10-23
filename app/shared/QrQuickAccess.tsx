"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";

type QrLink = {
  label: string;
  url: string;
};

function qrImageUrl(
  opaqueUrl: string,
) {
  return `https://quickchart.io/qr?size=220&margin=2&text=${encodeURIComponent(
    opaqueUrl,
  )}`;
}

export default function QrQuickAccess() {
  const pathname =
    usePathname();

  const [open, setOpen] =
    useState(false);

  const [links, setLinks] =
    useState<QrLink[]>(
      [],
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const eligible =
    pathname.startsWith(
      "/customer/account/invoices/",
    ) ||
    pathname.startsWith(
      "/customer/account/warranty/",
    ) ||
    pathname.startsWith(
      "/customer/account/orders/",
    );

  const targets =
    useMemo(() => {
      if (!eligible) {
        return [];
      }

      const result = [
        {
          label:
            "هذه الصفحة",
          path:
            pathname,
        },
      ];

      if (
        pathname.startsWith(
          "/customer/account/warranty/",
        )
      ) {
        const orderId =
          pathname
            .split("/")
            .filter(
              Boolean,
            )
            .pop();

        if (orderId) {
          result.push({
            label:
              "تفاصيل الطلب",
            path:
              `/customer/account/orders/${encodeURIComponent(
                orderId,
              )}`,
          });
        }
      }

      return result;
    }, [
      eligible,
      pathname,
    ]);

  useEffect(() => {
    if (
      !open ||
      targets.length ===
        0
    ) {
      return;
    }

    let active = true;

    setLoading(true);
    setError("");
    setLinks([]);

    Promise.all(
      targets.map(
        async (
          target,
        ) => {
          const response =
            await fetch(
              `/api/customer/qr-link?path=${encodeURIComponent(
                target.path,
              )}`,
              {
                cache:
                  "no-store",
              },
            );

          const data =
            await response
              .json()
              .catch(
                () => ({}),
              );

          if (
            !response.ok ||
            !data?.url
          ) {
            throw new Error(
              "تعذر تجهيز QR آمن.",
            );
          }

          return {
            label:
              target.label,
            url: String(
              data.url,
            ),
          };
        },
      ),
    )
      .then(
        (items) => {
          if (active) {
            setLinks(
              items,
            );
          }
        },
      )
      .catch(
        (err) => {
          if (active) {
            setError(
              err?.message ||
                "تعذر تجهيز QR آمن.",
            );
          }
        },
      )
      .finally(
        () => {
          if (active) {
            setLoading(
              false,
            );
          }
        },
      );

    return () => {
      active = false;
    };
  }, [
    open,
    targets,
  ]);

  if (!eligible) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="noPrint"
        onClick={() =>
          setOpen(true)
        }
        aria-label="عرض QR آمن لهذه الصفحة"
        title="QR"
        style={{
          position:
            "fixed",
          left: 18,
          bottom: 92,
          zIndex: 2920,
          minHeight: 43,
          border:
            "1px solid #bae6fd",
          borderRadius: 999,
          background:
            "white",
          color:
            "#075985",
          padding:
            "8px 13px",
          fontWeight: 900,
          boxShadow:
            "0 10px 26px rgba(7,26,43,.14)",
          cursor:
            "pointer",
        }}
      >
        ▦ QR
      </button>

      {open && (
        <div
          className="noPrint"
          onClick={() =>
            setOpen(
              false,
            )
          }
          style={{
            position:
              "fixed",
            inset: 0,
            zIndex: 7000,
            display:
              "grid",
            placeItems:
              "center",
            padding: 18,
            background:
              "rgba(7,26,43,.58)",
            backdropFilter:
              "blur(4px)",
          }}
        >
          <section
            dir="rtl"
            onClick={(
              event,
            ) =>
              event.stopPropagation()
            }
            style={{
              width:
                "min(390px,100%)",
              maxHeight:
                "85dvh",
              overflowY:
                "auto",
              background:
                "white",
              border:
                "1px solid #dbe7ef",
              borderRadius: 20,
              padding: 20,
              textAlign:
                "center",
              boxShadow:
                "0 24px 70px rgba(7,26,43,.28)",
            }}
          >
            <h2
              style={{
                color:
                  "#071a2b",
                marginTop: 0,
              }}
            >
              QR للوصول السريع
            </h2>

            <p
              style={{
                color:
                  "#64748b",
                lineHeight: 1.75,
              }}
            >
              الـQR يحتوي رابطًا مشفرًا بدل رابط المستند الحقيقي. صفحة الحساب نفسها تظل محمية بتسجيل الدخول.
            </p>

            {loading && (
              <div
                style={{
                  padding: 16,
                  color:
                    "#64748b",
                }}
              >
                جاري تجهيز QR آمن...
              </div>
            )}

            {error && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background:
                    "#fef2f2",
                  color:
                    "#991b1b",
                }}
              >
                {error}
              </div>
            )}

            {!loading &&
              !error && (
              <div
                style={{
                  display:
                    "grid",
                  gap: 16,
                }}
              >
                {links.map(
                  (item) => (
                    <div
                      key={
                        item.url
                      }
                    >
                      <strong
                        style={{
                          color:
                            "#0b2f49",
                          display:
                            "block",
                          marginBottom: 7,
                        }}
                      >
                        {
                          item.label
                        }
                      </strong>

                      <img
                        src={qrImageUrl(
                          item.url,
                        )}
                        alt={`QR - ${item.label}`}
                        width={
                          220
                        }
                        height={
                          220
                        }
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        style={{
                          display:
                            "block",
                          width:
                            220,
                          maxWidth:
                            "100%",
                          height:
                            "auto",
                          margin:
                            "0 auto 7px",
                          border:
                            "1px solid #e2e8f0",
                          borderRadius: 14,
                        }}
                      />

                      <small
                        style={{
                          display:
                            "block",
                          color:
                            "#94a3b8",
                          lineHeight: 1.6,
                        }}
                      >
                        رابط مشفر — لا يحتوي رقم الطلب أو الفاتورة بشكل ظاهر.
                      </small>
                    </div>
                  ),
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                setOpen(
                  false,
                )
              }
              style={{
                width:
                  "100%",
                minHeight: 44,
                marginTop: 14,
                border: 0,
                borderRadius: 11,
                background:
                  "#0b2f49",
                color:
                  "white",
                fontWeight: 900,
                cursor:
                  "pointer",
              }}
            >
              إغلاق
            </button>
          </section>
        </div>
      )}
    </>
  );
}
