"use client";

import {
  useEffect,
  useState,
} from "react";

export default function ArchiveRecoveryClient() {
  const [token, setToken] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [confirm, setConfirm] =
    useState("");
  const [busy, setBusy] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const [error, setError] =
    useState("");

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search,
      );

    setToken(
      params.get("token") || "",
    );
  }, []);

  async function requestReset() {
    setBusy(true);
    setMessage("");
    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/archive/forgot-password",
          {
            method: "POST",
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر إرسال رابط الاستعادة.",
        );
      }

      setMessage(
        `تم إرسال رابط الاستعادة إلى ${data.destination}. الرابط صالح 20 دقيقة.`,
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر إرسال رابط الاستعادة.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setMessage("");
    setError("");

    if (
      password.length < 10
    ) {
      setError(
        "كلمة السر يجب ألا تقل عن 10 أحرف.",
      );
      return;
    }

    if (
      password !== confirm
    ) {
      setError(
        "تأكيد كلمة السر غير مطابق.",
      );
      return;
    }

    setBusy(true);

    try {
      const response =
        await fetch(
          "/api/admin/archive/reset-password",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                token,
                password,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر إعادة تعيين كلمة السر.",
        );
      }

      setMessage(
        "تم تغيير كلمة سر Archive Vault وفتح الخزنة. تم إبطال جلسات الفتح القديمة.",
      );
      setPassword("");
      setConfirm("");

      window.setTimeout(() => {
        window.location.href =
          "/admin/archive";
      }, 1200);
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر إعادة تعيين كلمة السر.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={cardStyle}>
      <h1 style={{ marginTop: 0 }}>
        استعادة كلمة سر Archive Vault
      </h1>

      {!token ? (
        <>
          <p style={mutedStyle}>
            سيتم إرسال رابط آمن إلى
            بريد الاستعادة المحدد.
            الرابط يعمل لمدة 20 دقيقة
            ويتطلب أن تكون مسجلًا
            بحساب Super Admin.
          </p>

          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void requestReset()
            }
            style={primaryStyle}
          >
            {busy
              ? "جاري الإرسال..."
              : "إرسال رابط الاستعادة"}
          </button>
        </>
      ) : (
        <>
          <p style={mutedStyle}>
            اكتب كلمة سر جديدة
            للأرشيف. تغييرها يبطل
            كل جلسات Archive Vault
            القديمة.
          </p>

          <input
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value,
              )
            }
            placeholder="كلمة سر جديدة — 10 أحرف على الأقل"
            style={inputStyle}
          />

          <input
            type="password"
            value={confirm}
            onChange={(event) =>
              setConfirm(
                event.target.value,
              )
            }
            placeholder="تأكيد كلمة السر"
            style={{
              ...inputStyle,
              marginTop: 10,
            }}
          />

          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void reset()
            }
            style={{
              ...primaryStyle,
              marginTop: 12,
            }}
          >
            {busy
              ? "جاري التغيير..."
              : "تغيير كلمة سر الأرشيف"}
          </button>
        </>
      )}

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

const cardStyle: React.CSSProperties = {
  maxWidth: 620,
  margin: "20px auto",
  background: "white",
  border:
    "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 20,
};

const mutedStyle: React.CSSProperties = {
  color: "#64748b",
  lineHeight: 1.9,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 46,
  boxSizing: "border-box",
  border:
    "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "0 12px",
  font: "inherit",
};

const primaryStyle: React.CSSProperties = {
  minHeight: 44,
  border: 0,
  borderRadius: 10,
  background: "#0f2d4a",
  color: "white",
  padding: "0 15px",
  fontWeight: 900,
  cursor: "pointer",
};

const successStyle: React.CSSProperties = {
  marginTop: 12,
  padding: 11,
  borderRadius: 10,
  background: "#f0fdf4",
  border:
    "1px solid #bbf7d0",
  color: "#166534",
};

const errorStyle: React.CSSProperties = {
  marginTop: 12,
  padding: 11,
  borderRadius: 10,
  background: "#fef2f2",
  border:
    "1px solid #fecaca",
  color: "#991b1b",
};
