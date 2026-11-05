"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<
    "REQUEST" | "RESET" | "DONE"
  >("REQUEST");
  const [phone, setPhone] =
    useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] =
    useState("");
  const [confirm, setConfirm] =
    useState("");
  const [stagingOtp, setStagingOtp] =
    useState("");
  const [countdown, setCountdown] =
    useState(0);
  const [message, setMessage] =
    useState("");
  const [error, setError] =
    useState("");
  const [loading, setLoading] =
    useState(false);

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

  async function requestCode(
    event?: FormEvent,
  ) {
    event?.preventDefault();
    setError("");
    setMessage("");
    setStagingOtp("");
    setLoading(true);

    try {
      const response = await fetch(
        "/api/customer/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            phone,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر إرسال الكود",
        );
      }

      setMessage(
        data?.message ||
          "إذا كان الرقم مسجلًا فسيصلك كود الاستعادة.",
      );
      setStagingOtp(
        String(
          data?.stagingOtp || "",
        ),
      );
      setCountdown(
        Number(
          data?.retryAfterSeconds ||
            60,
        ),
      );
      setStep("RESET");
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر إرسال الكود",
      );
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(
    event: FormEvent,
  ) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (code.length !== 6) {
      setError(
        "اكتب الكود المكون من 6 أرقام.",
      );
      return;
    }

    if (password.length < 6) {
      setError(
        "كلمة المرور يجب ألا تقل عن 6 أحرف.",
      );
      return;
    }

    if (password !== confirm) {
      setError(
        "تأكيد كلمة المرور غير مطابق.",
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/customer/auth/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            phone,
            code,
            password,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر تغيير كلمة المرور",
        );
      }

      setMessage(data?.message);
      setStep("DONE");

      window.setTimeout(() => {
        router.push(
          "/customer/login",
        );
      }, 1600);
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر تغيير كلمة المرور",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="order" dir="rtl">
      <section
        className="panel loginCard"
        style={{ maxWidth: 520 }}
      >
        <Link
          href="/"
          className="brand center"
          style={{
            textDecoration: "none",
          }}
        >
          <i>V</i> Ventic Pro
        </Link>

        <h1
          style={{
            textAlign: "center",
          }}
        >
          نسيت كلمة المرور
        </h1>

        {step === "REQUEST" && (
          <form
            onSubmit={requestCode}
          >
            <p
              style={{
                textAlign: "center",
                color: "#64748b",
              }}
            >
              اكتب رقم الموبايل المسجل بالحساب وسنرسل لك كود استعادة.
            </p>

            <label className="field">
              <span>
                رقم الموبايل
              </span>
              <input
                inputMode="numeric"
                placeholder="01xxxxxxxxx"
                value={phone}
                onChange={(event) =>
                  setPhone(
                    event.target.value,
                  )
                }
                required
              />
            </label>

            <button
              className="button full"
              disabled={loading}
            >
              {loading
                ? "جاري الإرسال..."
                : "إرسال كود الاستعادة"}
            </button>
          </form>
        )}

        {step === "RESET" && (
          <form
            onSubmit={resetPassword}
          >
            <p
              style={{
                textAlign: "center",
                color: "#64748b",
              }}
            >
              أدخل الكود الذي وصلك ثم اختر كلمة مرور جديدة.
            </p>

            {stagingOtp && (
              <div
                style={{
                  background:
                    "#fffbeb",
                  border:
                    "1px solid #fde68a",
                  color: "#92400e",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 12,
                  textAlign: "center",
                }}
              >
                <strong>
                  وضع التجربة
                </strong>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 900,
                    letterSpacing: 5,
                    direction: "ltr",
                    marginTop: 6,
                  }}
                >
                  {stagingOtp}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setCode(
                      stagingOtp,
                    )
                  }
                  style={{
                    marginTop: 8,
                  }}
                >
                  استخدام الكود
                </button>
              </div>
            )}

            <label className="field">
              <span>
                كود الاستعادة
              </span>
              <input
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(event) =>
                  setCode(
                    event.target.value
                      .replace(
                        /\D/g,
                        "",
                      )
                      .slice(0, 6),
                  )
                }
                required
              />
            </label>

            <label className="field">
              <span>
                كلمة المرور الجديدة
              </span>
              <input
                type="password"
                minLength={6}
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
                required
              />
            </label>

            <label className="field">
              <span>
                تأكيد كلمة المرور
              </span>
              <input
                type="password"
                minLength={6}
                value={confirm}
                onChange={(event) =>
                  setConfirm(
                    event.target.value,
                  )
                }
                required
              />
            </label>

            <button
              className="button full"
              disabled={loading}
            >
              {loading
                ? "جاري الحفظ..."
                : "تغيير كلمة المرور"}
            </button>

            <button
              type="button"
              className="outline full"
              disabled={
                loading ||
                countdown > 0
              }
              onClick={() =>
                void requestCode()
              }
              style={{
                marginTop: 8,
              }}
            >
              {countdown > 0
                ? `إعادة الإرسال بعد ${countdown} ث`
                : "إعادة إرسال الكود"}
            </button>
          </form>
        )}

        {step === "DONE" && (
          <div
            style={{
              textAlign: "center",
            }}
          >
            <h2>
              تم تغيير كلمة المرور ✓
            </h2>
            <p>
              سيتم تحويلك لتسجيل الدخول.
            </p>
            <Link
              href="/customer/login"
              className="button"
            >
              تسجيل الدخول الآن
            </Link>
          </div>
        )}

        {message && (
          <p
            style={{
              background:
                "#f0fdf4",
              border:
                "1px solid #bbf7d0",
              color: "#166534",
              borderRadius: 10,
              padding: 10,
            }}
          >
            {message}
          </p>
        )}

        {error && (
          <p className="errorText">
            {error}
          </p>
        )}

        <p
          style={{
            textAlign: "center",
            marginTop: 18,
          }}
        >
          <Link href="/customer/login">
            العودة لتسجيل الدخول
          </Link>
        </p>
      </section>
    </main>
  );
}
