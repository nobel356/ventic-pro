"use client";

import { useEffect, useState } from "react";

type Article = {
  id: string;
  slug: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "SCHEDULED";
  scheduledAt?: string | null;
  visualPath?: string | null;
};

type Revision = {
  id: string;
  createdByLabel: string | null;
  createdAt: string;
};

export default function BlogWorkflowPanel({
  article,
  onChanged,
}: {
  article: Article;
  onChanged: () => Promise<void>;
}) {
  const [scheduledAt, setScheduledAt] =
    useState(
      article.scheduledAt
        ? new Date(article.scheduledAt)
            .toISOString()
            .slice(0, 16)
        : "",
    );
  const [revisions, setRevisions] =
    useState<Revision[]>([]);
  const [busy, setBusy] =
    useState(false);
  const [message, setMessage] =
    useState("");

  async function loadRevisions() {
    const res = await fetch(
      "/api/admin/blog/revisions?articleId=" +
        encodeURIComponent(article.id),
      { cache: "no-store" },
    );

    const data =
      await res.json().catch(() => ({}));

    setRevisions(
      Array.isArray(data?.items)
        ? data.items
        : [],
    );
  }

  useEffect(() => {
    setScheduledAt(
      article.scheduledAt
        ? new Date(article.scheduledAt)
            .toISOString()
            .slice(0, 16)
        : "",
    );
    void loadRevisions();
  }, [article.id, article.scheduledAt]);

  async function changeStatus(
    status:
      | "DRAFT"
      | "PUBLISHED"
      | "SCHEDULED",
  ) {
    if (
      status === "SCHEDULED" &&
      !scheduledAt
    ) {
      setMessage(
        "حدد تاريخ ووقت النشر أولًا.",
      );
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const res = await fetch(
        "/api/admin/blog",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: article.id,
            status,
            scheduledAt:
              status === "SCHEDULED"
                ? new Date(
                    scheduledAt,
                  ).toISOString()
                : null,
          }),
        },
      );

      const data =
        await res
          .json()
          .catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "تعذر تغيير حالة النشر.",
        );
      }

      setMessage(
        status === "PUBLISHED"
          ? "تم النشر الآن."
          : status === "SCHEDULED"
            ? "تمت جدولة النشر."
            : "تم تحويل المقال إلى مسودة.",
      );

      await onChanged();
      await loadRevisions();
    } catch (error: any) {
      setMessage(
        error?.message ||
          "تعذر تغيير حالة النشر.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(
    file: File,
  ) {
    setBusy(true);
    setMessage("");

    try {
      const form = new FormData();
      form.set(
        "articleId",
        article.id,
      );
      form.set("file", file);

      const res = await fetch(
        "/api/admin/blog/image",
        {
          method: "POST",
          body: form,
        },
      );

      const data =
        await res
          .json()
          .catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.error ===
          "IMAGE_TOO_LARGE"
            ? "الصورة أكبر من 4MB."
            : data?.error ===
                "INVALID_BLOG_IMAGE"
              ? "استخدم JPG أو PNG أو WebP فقط."
              : data?.error ||
                "تعذر رفع الصورة.",
        );
      }

      setMessage("تم تحديث صورة المقال.");
      await onChanged();
    } catch (error: any) {
      setMessage(
        error?.message ||
          "تعذر رفع الصورة.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function restoreRevision(
    revisionId: string,
  ) {
    if (
      !window.confirm(
        "استرجاع هذه النسخة؟ سيتم حفظ النسخة الحالية في السجل قبل الاسترجاع.",
      )
    ) {
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const res = await fetch(
        "/api/admin/blog/revisions",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            articleId: article.id,
            revisionId,
          }),
        },
      );

      const data =
        await res
          .json()
          .catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "تعذر استرجاع النسخة.",
        );
      }

      setMessage(
        "تم استرجاع النسخة السابقة.",
      );
      await onChanged();
      await loadRevisions();
    } catch (error: any) {
      setMessage(
        error?.message ||
          "تعذر استرجاع النسخة.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
      }}
    >
      {message && (
        <div
          style={{
            background: "#f0f9ff",
            border:
              "1px solid #bae6fd",
            borderRadius: 10,
            padding: 10,
            color: "#075985",
            fontWeight: 800,
          }}
        >
          {message}
        </div>
      )}

      <section style={card}>
        <h3 style={title}>
          حالة النشر
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(220px,1fr))",
            gap: 10,
          }}
        >
          <label style={field}>
            <span>موعد النشر المجدول</span>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) =>
                setScheduledAt(
                  event.target.value,
                )
              }
              style={input}
            />
          </label>

          <div
            style={{
              display: "flex",
              gap: 7,
              alignItems: "end",
              flexWrap: "wrap",
            }}
          >
            <button
              disabled={busy}
              onClick={() =>
                void changeStatus(
                  "PUBLISHED",
                )
              }
              style={primary}
            >
              نشر الآن
            </button>

            <button
              disabled={busy}
              onClick={() =>
                void changeStatus(
                  "SCHEDULED",
                )
              }
              style={secondary}
            >
              جدولة
            </button>

            <button
              disabled={busy}
              onClick={() =>
                void changeStatus(
                  "DRAFT",
                )
              }
              style={secondary}
            >
              تحويل لمسودة
            </button>
          </div>
        </div>
      </section>

      <section style={card}>
        <h3 style={title}>
          صورة المقال
        </h3>

        {article.visualPath && (
          <img
            src={article.visualPath}
            alt=""
            style={{
              width: "100%",
              maxWidth: 520,
              height: "auto",
              borderRadius: 12,
              border:
                "1px solid #dbe7ef",
              marginBottom: 10,
            }}
          />
        )}

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(event) => {
            const file =
              event.target.files?.[0];
            if (file) {
              void uploadImage(file);
            }
            event.currentTarget.value =
              "";
          }}
        />

        <small
          style={{
            color: "#64748b",
            display: "block",
            marginTop: 7,
          }}
        >
          JPG / PNG / WebP — بحد أقصى 4MB.
        </small>
      </section>

      <section style={card}>
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <h3 style={title}>
            المعاينة
          </h3>

          <a
            href={
              "/admin/blog/preview/" +
              article.id
            }
            target="_blank"
            rel="noreferrer"
            style={secondary}
          >
            معاينة المقال ↗
          </a>
        </div>

        <p
          style={{
            color: "#64748b",
            lineHeight: 1.8,
            marginBottom: 0,
          }}
        >
          المعاينة تعمل للمسودات والمقالات المجدولة بدون نشرها للعامة.
        </p>
      </section>

      <section style={card}>
        <h3 style={title}>
          سجل النسخ
        </h3>

        {revisions.length === 0 ? (
          <p
            style={{
              color: "#64748b",
            }}
          >
            لا توجد نسخ سابقة بعد.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 7,
            }}
          >
            {revisions.map(
              (revision) => (
                <div
                  key={revision.id}
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: 8,
                    alignItems:
                      "center",
                    border:
                      "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: 9,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <strong
                      style={{
                        color:
                          "#0b2f49",
                        fontSize: 12,
                      }}
                    >
                      {new Date(
                        revision.createdAt,
                      ).toLocaleString(
                        "ar-EG",
                      )}
                    </strong>
                    <small
                      style={{
                        color:
                          "#64748b",
                        display:
                          "block",
                      }}
                    >
                      {revision.createdByLabel ||
                        "Admin"}
                    </small>
                  </div>

                  <button
                    disabled={busy}
                    onClick={() =>
                      void restoreRevision(
                        revision.id,
                      )
                    }
                    style={secondary}
                  >
                    استرجاع
                  </button>
                </div>
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 13,
  padding: 13,
};

const title: React.CSSProperties = {
  color: "#0b2f49",
  margin: "0 0 10px",
};

const field: React.CSSProperties = {
  display: "grid",
  gap: 6,
  color: "#334155",
  fontWeight: 900,
  fontSize: 12,
};

const input: React.CSSProperties = {
  minHeight: 42,
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "9px 10px",
  font: "inherit",
};

const primary: React.CSSProperties = {
  border: 0,
  borderRadius: 10,
  background: "#0b2f49",
  color: "white",
  padding: "9px 13px",
  minHeight: 40,
  fontWeight: 900,
  cursor: "pointer",
  textDecoration: "none",
};

const secondary: React.CSSProperties = {
  ...primary,
  background: "#eef8fd",
  color: "#075985",
  border: "1px solid #bae6fd",
};
