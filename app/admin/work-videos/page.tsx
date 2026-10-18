"use client";

import { useEffect, useState } from "react";

type Item = {
  id: string;
  title: string;
  caption: string | null;
  location: string | null;
  serviceType: string | null;
  blobUrl: string;
  blobPathname: string;
  sortOrder: number;
  customerConsent: boolean;
  isPublished: boolean;
  createdAt: string;
};

const emptyForm = {
  title: "",
  caption: "",
  location: "",
  serviceType: "",
  sortOrder: 0,
  customerConsent: false,
  isPublished: false,
};

function fileSizeLabel(
  bytes: number,
) {
  if (
    !Number.isFinite(bytes) ||
    bytes <= 0
  ) {
    return "";
  }

  const mb =
    bytes /
    (1024 * 1024);

  return `${mb.toFixed(
    mb >= 100 ? 0 : 1,
  )} MB`;
}

export default function PortfolioVideosAdmin() {
  const [items, setItems] =
    useState<Item[]>([]);
  const [form, setForm] =
    useState(emptyForm);
  const [file, setFile] =
    useState<File | null>(
      null,
    );
  const [busy, setBusy] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const [
    uploadProgress,
    setUploadProgress,
  ] = useState(0);
  const [
    uploadStage,
    setUploadStage,
  ] =
    useState<
      | "idle"
      | "token"
      | "upload"
      | "save"
      | "done"
      | "error"
    >("idle");

  async function load() {
    const response =
      await fetch(
        "/api/admin/portfolio-videos",
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

    if (!response.ok) {
      setMessage(
        data?.error ||
          "تعذر تحميل الفيديوهات.",
      );
      return;
    }

    setItems(
      data?.items || [],
    );
  }

  useEffect(() => {
    void load();
  }, []);

  async function createVideo() {
    if (!file) {
      setMessage(
        "اختار فيديو الأول.",
      );
      return;
    }

    if (!form.title.trim()) {
      setMessage(
        "اكتب عنوان الفيديو.",
      );
      return;
    }

    if (
      form.isPublished &&
      !form.customerConsent
    ) {
      setMessage(
        "لا يمكن النشر قبل تأكيد موافقة العميل.",
      );
      return;
    }

    if (
      file.size >
      500 * 1024 * 1024
    ) {
      setMessage(
        "الحد الأقصى للفيديو 500 MB.",
      );
      return;
    }

    setBusy(true);
    setUploadProgress(0);
    setUploadStage("token");
    setMessage(
      "جاري تجهيز تصريح الرفع...",
    );

    try {
      const extension =
        file.name.includes(".")
          ? file.name
              .split(".")
              .pop()
              ?.toLowerCase()
              .replace(/[^a-z0-9]/g, "")
              .slice(0, 8) || "mp4"
          : "mp4";

      const contentType =
        file.type ||
        (extension === "mov"
          ? "video/quicktime"
          : extension === "webm"
            ? "video/webm"
            : "video/mp4");

      const presignResponse =
        await fetch(
          "/api/admin/portfolio-videos/presign",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                extension,
                contentType,
                size:
                  file.size,
              }),
          },
        );

      const presignData =
        await presignResponse
          .json()
          .catch(
            () => ({}),
          );

      if (
        !presignResponse.ok ||
        !presignData?.presignedUrl ||
        !presignData?.pathname
      ) {
        throw new Error(
          presignData?.detail ||
            presignData?.error ||
            "تعذر تجهيز رابط الرفع.",
        );
      }

      const pathname =
        String(
          presignData.pathname,
        );

      setUploadStage(
        "upload",
      );
      setMessage(
        "جاري رفع الفيديو... 0%",
      );

      const uploadedBlob =
        await new Promise<{
          url?: string;
          pathname?: string;
        }>(
          (
            resolve,
            reject,
          ) => {
            const xhr =
              new XMLHttpRequest();

            xhr.open(
              "PUT",
              String(
                presignData.presignedUrl,
              ),
              true,
            );

            xhr.setRequestHeader(
              "content-type",
              contentType,
            );

            xhr.upload.onprogress =
              (event) => {
                if (
                  !event.lengthComputable
                ) {
                  return;
                }

                const next =
                  Math.max(
                    0,
                    Math.min(
                      100,
                      Math.round(
                        (event.loaded /
                          event.total) *
                          100,
                      ),
                    ),
                  );

                setUploadProgress(
                  next,
                );

                setMessage(
                  `جاري رفع الفيديو... ${next}%`,
                );
              };

            xhr.onerror =
              () =>
                reject(
                  new Error(
                    "فشل الاتصال أثناء رفع الفيديو.",
                  ),
                );

            xhr.onabort =
              () =>
                reject(
                  new Error(
                    "تم إلغاء رفع الفيديو.",
                  ),
                );

            xhr.onload = () => {
              if (
                xhr.status < 200 ||
                xhr.status >= 300
              ) {
                reject(
                  new Error(
                    xhr.responseText ||
                      `فشل رفع الفيديو (${xhr.status}).`,
                  ),
                );
                return;
              }

              try {
                resolve(
                  xhr.responseText
                    ? JSON.parse(
                        xhr.responseText,
                      )
                    : {},
                );
              } catch {
                resolve({});
              }
            };

            xhr.send(file);
          },
        );

      const blob = {
        url:
          uploadedBlob.url ||
          pathname,
        pathname:
          uploadedBlob.pathname ||
          pathname,
      };

      setUploadProgress(100);
      setUploadStage("save");
      setMessage(
        "تم رفع الفيديو 100%. جاري حفظ البيانات...",
      );

      const response =
        await fetch(
          "/api/admin/portfolio-videos",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                ...form,
                blobUrl:
                  blob.url,
                blobPathname:
                  blob.pathname,
              }),
          },
        );

      const data =
        await response
          .json()
          .catch(
            () => ({}),
          );

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر حفظ بيانات الفيديو.",
        );
      }

      setForm(emptyForm);
      setFile(null);
      setUploadStage("done");
      setMessage(
        "تم رفع الفيديو وحفظه بنجاح.",
      );

      await load();

      const input =
        document.getElementById(
          "portfolio-video-file",
        ) as HTMLInputElement | null;

      if (input) {
        input.value = "";
      }
    } catch (error: any) {
      setUploadStage(
        "error",
      );

      const raw =
        String(
          error?.message ||
            "تعذر رفع الفيديو.",
        );

      const friendly =
        raw.includes(
          "Failed to retrieve the client token",
        )
          ? "تعذر الحصول على تصريح الرفع من التخزين. جرّب Refresh ثم أعد المحاولة."
          : raw;

      setMessage(
        friendly,
      );
    } finally {
      setBusy(false);
    }
  }

  async function save(
    item: Item,
  ) {
    setBusy(true);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/portfolio-videos",
          {
            method:
              "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
                item,
              ),
          },
        );

      const data =
        await response
          .json()
          .catch(
            () => ({}),
          );

      if (!response.ok) {
        throw new Error(
          data?.error ===
            "CUSTOMER_CONSENT_REQUIRED"
            ? "لا يمكن نشر الفيديو قبل تأكيد موافقة العميل."
            : data?.error ||
                "تعذر حفظ التعديلات.",
        );
      }

      setMessage(
        "تم حفظ التعديلات.",
      );

      await load();
    } catch (error: any) {
      setMessage(
        error?.message ||
          "تعذر حفظ التعديلات.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(
    item: Item,
  ) {
    const ok =
      window.confirm(
        `حذف "${item.title}" نهائيًا من الموقع والتخزين؟`,
      );

    if (!ok) return;

    setBusy(true);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/portfolio-videos",
          {
            method:
              "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                id: item.id,
              }),
          },
        );

      const data =
        await response
          .json()
          .catch(
            () => ({}),
          );

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر حذف الفيديو.",
        );
      }

      setMessage(
        "تم حذف الفيديو.",
      );

      await load();
    } catch (error: any) {
      setMessage(
        error?.message ||
          "تعذر حذف الفيديو.",
      );
    } finally {
      setBusy(false);
    }
  }

  function patchItem(
    id: string,
    patch: Partial<Item>,
  ) {
    setItems(
      (current) =>
        current.map(
          (item) =>
            item.id === id
              ? {
                  ...item,
                  ...patch,
                }
              : item,
        ),
    );
  }

  const progressVisible =
    uploadStage !==
      "idle" &&
    uploadStage !==
      "done";

  return (
    <main
      className="vpPortfolioAdminPage"
      dir="rtl"
      style={{
        width:
          "min(1180px, calc(100% - 28px))",
        margin: "0 auto",
        padding:
          "18px 0 110px",
      }}
    >
      <div
        style={{
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              color: "#0284c7",
              fontWeight: 900,
              fontSize: 13,
            }}
          >
            Ventic Pro Portfolio
          </span>

          <span
            style={{
              background: "#dcfce7",
              color: "#166534",
              border: "1px solid #bbf7d0",
              borderRadius: 999,
              padding: "4px 8px",
              fontSize: 11,
              fontWeight: 900,
            }}
          >
            Uploader V16I
          </span>
        </div>

        <h1
          style={{
            color:
              "#071a2b",
            margin:
              "5px 0 7px",
          }}
        >
          فيديوهات التنفيذ
        </h1>

        <p
          style={{
            color:
              "#64748b",
            lineHeight: 1.8,
            margin: 0,
          }}
        >
          ارفع فيديوهات تنفيذ العملاء. الفيديو لا يظهر للعامة إلا بعد تأكيد موافقة العميل وتفعيل النشر.
        </p>
      </div>

      <section
        style={cardStyle}
      >
        <h2
          style={{
            marginTop: 0,
            color:
              "#0b2f49",
          }}
        >
          رفع فيديو جديد
        </h2>

        <div
          style={gridStyle}
        >
          <label
            style={
              fieldStyle
            }
          >
            <span>
              عنوان الفيديو *
            </span>

            <input
              value={
                form.title
              }
              disabled={
                busy
              }
              onChange={(
                event,
              ) =>
                setForm(
                  (value) => ({
                    ...value,
                    title:
                      event
                        .target
                        .value,
                  }),
                )
              }
              placeholder="مثال: تركيب هود وخط طرد"
              style={
                inputStyle
              }
            />
          </label>

          <label
            style={
              fieldStyle
            }
          >
            <span>
              نوع الخدمة
            </span>

            <input
              value={
                form.serviceType
              }
              disabled={
                busy
              }
              onChange={(
                event,
              ) =>
                setForm(
                  (value) => ({
                    ...value,
                    serviceType:
                      event
                        .target
                        .value,
                  }),
                )
              }
              placeholder="هود / بلاور / تهوية مطبخ"
              style={
                inputStyle
              }
            />
          </label>

          <label
            style={
              fieldStyle
            }
          >
            <span>
              المنطقة
            </span>

            <input
              value={
                form.location
              }
              disabled={
                busy
              }
              onChange={(
                event,
              ) =>
                setForm(
                  (value) => ({
                    ...value,
                    location:
                      event
                        .target
                        .value,
                  }),
                )
              }
              placeholder="مثال: التجمع الخامس"
              style={
                inputStyle
              }
            />
          </label>

          <label
            style={
              fieldStyle
            }
          >
            <span>
              الترتيب
            </span>

            <input
              type="number"
              value={
                form.sortOrder
              }
              disabled={
                busy
              }
              onChange={(
                event,
              ) =>
                setForm(
                  (value) => ({
                    ...value,
                    sortOrder:
                      Number(
                        event
                          .target
                          .value,
                      ) ||
                      0,
                  }),
                )
              }
              style={
                inputStyle
              }
            />
          </label>
        </div>

        <label
          style={{
            ...fieldStyle,
            marginTop: 12,
          }}
        >
          <span>
            وصف مختصر
          </span>

          <textarea
            value={
              form.caption
            }
            disabled={
              busy
            }
            onChange={(
              event,
            ) =>
              setForm(
                (value) => ({
                  ...value,
                  caption:
                    event
                      .target
                      .value,
                }),
              )
            }
            placeholder="تفاصيل بسيطة عن التنفيذ..."
            style={{
              ...inputStyle,
              minHeight: 90,
              resize:
                "vertical",
            }}
          />
        </label>

        <label
          style={{
            ...fieldStyle,
            marginTop: 12,
            border:
              "1px dashed #9ec9e3",
            borderRadius: 14,
            padding: 14,
            background:
              "#f8fcff",
          }}
        >
          <span>
            ملف الفيديو — MP4 هو الأفضل للتوافق
          </span>

          <input
            id="portfolio-video-file"
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            disabled={
              busy
            }
            onChange={(
              event,
            ) => {
              setFile(
                event
                  .target
                  .files?.[0] ||
                  null,
              );

              setUploadProgress(
                0,
              );

              setUploadStage(
                "idle",
              );

              setMessage("");
            }}
            style={{
              fontSize: 16,
            }}
          />

          {file && (
            <small
              style={{
                color:
                  "#475569",
                fontWeight: 800,
              }}
            >
              {file.name} ·{" "}
              {fileSizeLabel(
                file.size,
              )}
            </small>
          )}

          <small
            style={{
              color:
                "#64748b",
            }}
          >
            يدعم MP4 / MOV / WebM حتى 500 MB. يفضل MP4 H.264 عشان يشتغل على كل الأجهزة.
          </small>
        </label>

        {progressVisible && (
          <div
            style={{
              marginTop: 14,
              padding: 13,
              border:
                uploadStage ===
                "error"
                  ? "1px solid #fecaca"
                  : "1px solid #cfe8f5",
              borderRadius: 14,
              background:
                uploadStage ===
                "error"
                  ? "#fef2f2"
                  : "#f8fcff",
            }}
          >
            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                gap: 10,
                marginBottom: 8,
                color:
                  uploadStage ===
                  "error"
                    ? "#991b1b"
                    : "#0b2f49",
                fontWeight: 900,
                fontSize: 13,
              }}
            >
              <span>
                {uploadStage ===
                "token"
                  ? "جاري تجهيز الرفع..."
                  : uploadStage ===
                      "save"
                    ? "جاري حفظ البيانات..."
                    : uploadStage ===
                        "error"
                      ? "فشل الرفع"
                      : "جاري رفع الفيديو"}
              </span>

              <strong>
                {uploadProgress}%
              </strong>
            </div>

            <div
              style={{
                width: "100%",
                height: 12,
                background:
                  "#dcecf5",
                borderRadius: 999,
                overflow:
                  "hidden",
              }}
            >
              <div
                style={{
                  width: `${
                    uploadStage ===
                      "token" &&
                    uploadProgress ===
                      0
                      ? 2
                      : uploadProgress
                  }%`,
                  height: "100%",
                  background:
                    uploadStage ===
                    "error"
                      ? "#dc2626"
                      : "linear-gradient(90deg,#0a84ff,#38bdf8)",
                  borderRadius: 999,
                  transition:
                    "width .18s ease",
                }}
              />
            </div>
          </div>
        )}

        <div
          style={{
            display:
              "flex",
            gap: 12,
            flexWrap:
              "wrap",
            marginTop: 14,
          }}
        >
          <label
            style={checkStyle}
          >
            <input
              type="checkbox"
              checked={
                form.customerConsent
              }
              disabled={
                busy
              }
              onChange={(
                event,
              ) =>
                setForm(
                  (value) => ({
                    ...value,
                    customerConsent:
                      event
                        .target
                        .checked,
                  }),
                )
              }
            />

            عندي موافقة العميل على عرض الفيديو للعامة
          </label>

          <label
            style={checkStyle}
          >
            <input
              type="checkbox"
              checked={
                form.isPublished
              }
              disabled={
                busy
              }
              onChange={(
                event,
              ) =>
                setForm(
                  (value) => ({
                    ...value,
                    isPublished:
                      event
                        .target
                        .checked,
                  }),
                )
              }
            />

            نشر فورًا على الموقع
          </label>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void createVideo()
          }
          style={{
            ...primaryButton,
            opacity:
              busy
                ? 0.65
                : 1,
          }}
        >
          {uploadStage ===
          "token"
            ? "جاري تجهيز الرفع..."
            : uploadStage ===
                "upload"
              ? `جاري الرفع ${uploadProgress}%`
              : uploadStage ===
                  "save"
                ? "جاري حفظ البيانات..."
                : "رفع الفيديو"}
        </button>
      </section>

      {message && (
        <div
          style={{
            margin:
              "14px 0",
            padding: 12,
            borderRadius: 12,
            background:
              uploadStage ===
              "error"
                ? "#fef2f2"
                : "#eef8fd",
            border:
              uploadStage ===
              "error"
                ? "1px solid #fecaca"
                : "1px solid #cfe8f5",
            color:
              uploadStage ===
              "error"
                ? "#991b1b"
                : "#0b2f49",
            fontWeight: 800,
          }}
        >
          {message}
        </div>
      )}

      <section
        style={{
          marginTop: 22,
        }}
      >
        <h2
          style={{
            color:
              "#071a2b",
          }}
        >
          الفيديوهات الحالية (
          {items.length})
        </h2>

        <div
          style={{
            display:
              "grid",
            gap: 14,
          }}
        >
          {items.map(
            (item) => (
              <article
                key={
                  item.id
                }
                style={
                  cardStyle
                }
              >
                <div
                  className="vpPortfolioAdminRow"
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "minmax(180px,260px) 1fr",
                    gap: 16,
                  }}
                >
                  <video
                    src={
                      item.blobUrl
                    }
                    controls
                    playsInline
                    preload="metadata"
                    style={{
                      width:
                        "100%",
                      aspectRatio:
                        "9 / 16",
                      maxHeight:
                        390,
                      objectFit:
                        "contain",
                      background:
                        "#071a2b",
                      borderRadius:
                        14,
                    }}
                  />

                  <div>
                    <div
                      style={
                        gridStyle
                      }
                    >
                      <label
                        style={
                          fieldStyle
                        }
                      >
                        <span>
                          العنوان
                        </span>
                        <input
                          value={
                            item.title
                          }
                          onChange={(
                            event,
                          ) =>
                            patchItem(
                              item.id,
                              {
                                title:
                                  event
                                    .target
                                    .value,
                              },
                            )
                          }
                          style={
                            inputStyle
                          }
                        />
                      </label>

                      <label
                        style={
                          fieldStyle
                        }
                      >
                        <span>
                          نوع الخدمة
                        </span>
                        <input
                          value={
                            item.serviceType ||
                            ""
                          }
                          onChange={(
                            event,
                          ) =>
                            patchItem(
                              item.id,
                              {
                                serviceType:
                                  event
                                    .target
                                    .value,
                              },
                            )
                          }
                          style={
                            inputStyle
                          }
                        />
                      </label>

                      <label
                        style={
                          fieldStyle
                        }
                      >
                        <span>
                          المنطقة
                        </span>
                        <input
                          value={
                            item.location ||
                            ""
                          }
                          onChange={(
                            event,
                          ) =>
                            patchItem(
                              item.id,
                              {
                                location:
                                  event
                                    .target
                                    .value,
                              },
                            )
                          }
                          style={
                            inputStyle
                          }
                        />
                      </label>

                      <label
                        style={
                          fieldStyle
                        }
                      >
                        <span>
                          الترتيب
                        </span>
                        <input
                          type="number"
                          value={
                            item.sortOrder
                          }
                          onChange={(
                            event,
                          ) =>
                            patchItem(
                              item.id,
                              {
                                sortOrder:
                                  Number(
                                    event
                                      .target
                                      .value,
                                  ) ||
                                  0,
                              },
                            )
                          }
                          style={
                            inputStyle
                          }
                        />
                      </label>
                    </div>

                    <label
                      style={{
                        ...fieldStyle,
                        marginTop: 10,
                      }}
                    >
                      <span>
                        الوصف
                      </span>

                      <textarea
                        value={
                          item.caption ||
                          ""
                        }
                        onChange={(
                          event,
                        ) =>
                          patchItem(
                            item.id,
                            {
                              caption:
                                event
                                  .target
                                  .value,
                            },
                          )
                        }
                        style={{
                          ...inputStyle,
                          minHeight: 78,
                          resize:
                            "vertical",
                        }}
                      />
                    </label>

                    <div
                      style={{
                        display:
                          "flex",
                        gap: 12,
                        flexWrap:
                          "wrap",
                        marginTop: 12,
                      }}
                    >
                      <label
                        style={
                          checkStyle
                        }
                      >
                        <input
                          type="checkbox"
                          checked={
                            item.customerConsent
                          }
                          onChange={(
                            event,
                          ) =>
                            patchItem(
                              item.id,
                              {
                                customerConsent:
                                  event
                                    .target
                                    .checked,
                              },
                            )
                          }
                        />
                        موافقة العميل
                      </label>

                      <label
                        style={
                          checkStyle
                        }
                      >
                        <input
                          type="checkbox"
                          checked={
                            item.isPublished
                          }
                          onChange={(
                            event,
                          ) =>
                            patchItem(
                              item.id,
                              {
                                isPublished:
                                  event
                                    .target
                                    .checked,
                              },
                            )
                          }
                        />
                        منشور
                      </label>
                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        gap: 8,
                        flexWrap:
                          "wrap",
                        marginTop: 14,
                      }}
                    >
                      <button
                        type="button"
                        disabled={
                          busy
                        }
                        onClick={() =>
                          void save(
                            item,
                          )
                        }
                        style={
                          primaryButton
                        }
                      >
                        حفظ
                      </button>

                      <button
                        type="button"
                        disabled={
                          busy
                        }
                        onClick={() =>
                          void remove(
                            item,
                          )
                        }
                        style={
                          dangerButton
                        }
                      >
                        حذف نهائي
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ),
          )}

          {items.length ===
            0 && (
            <div
              style={{
                ...cardStyle,
                color:
                  "#64748b",
              }}
            >
              مفيش فيديوهات مرفوعة لسه.
            </div>
          )}
        </div>
      </section>

      <style>{`
        @media (max-width: 720px) {
          .vpPortfolioAdminRow {
            grid-template-columns: 1fr !important;
          }

          .vpPortfolioAdminRow > video {
            width: min(100%, 360px) !important;
            margin: 0 auto;
          }
        }
      `}</style>
    </main>
  );
}

const cardStyle:
  React.CSSProperties = {
  background: "white",
  border:
    "1px solid #dbe7ef",
  borderRadius: 18,
  padding: 18,
  boxShadow:
    "0 10px 30px rgba(7,26,43,.07)",
};

const gridStyle:
  React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(190px,1fr))",
  gap: 10,
};

const fieldStyle:
  React.CSSProperties = {
  display: "grid",
  gap: 6,
  color: "#475569",
  fontSize: 13,
  fontWeight: 800,
};

const inputStyle:
  React.CSSProperties = {
  width: "100%",
  minHeight: 46,
  border:
    "1px solid #dbe4ec",
  borderRadius: 11,
  padding: "10px 12px",
  background: "white",
  color: "#0f172a",
  font: "inherit",
};

const checkStyle:
  React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  color: "#334155",
  fontWeight: 800,
  fontSize: 13,
};

const primaryButton:
  React.CSSProperties = {
  minHeight: 44,
  border: 0,
  borderRadius: 11,
  background:
    "linear-gradient(135deg,#0a84ff,#0574d4)",
  color: "white",
  padding:
    "10px 16px",
  fontWeight: 900,
  cursor: "pointer",
  marginTop: 14,
};

const dangerButton:
  React.CSSProperties = {
  minHeight: 44,
  border:
    "1px solid #fecaca",
  borderRadius: 11,
  background: "#fef2f2",
  color: "#b91c1c",
  padding:
    "10px 16px",
  fontWeight: 900,
  cursor: "pointer",
  marginTop: 14,
};
