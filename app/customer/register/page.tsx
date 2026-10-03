"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CustomerRegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(searchParams.get("phone") || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function register(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("كلمة المرور يجب ألا تقل عن 6 أحرف.");
      return;
    }

    if (password !== confirm) {
      setError("تأكيد كلمة المرور غير مطابق.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/customer/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "تعذر إنشاء الحساب");
      }

      router.push("/customer/account");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "تعذر إنشاء الحساب");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="order" dir="rtl">
      <section className="panel loginCard" style={{ maxWidth: 520 }}>
        <Link
          href="/"
          className="brand center"
          style={{ textDecoration: "none" }}
        >
          <i>V</i> Ventic Pro
        </Link>

        <h1 style={{ textAlign: "center" }}>إنشاء حساب عميل</h1>
        <p style={{ textAlign: "center", color: "#64748b" }}>
          لو سبق وقدمت طلبًا بنفس رقم الموبايل، كل طلباتك القديمة ستظهر تلقائيًا في الحساب.
        </p>

        <form onSubmit={register}>
          <label className="field">
            <span>الاسم</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
            />
          </label>

          <label className="field">
            <span>رقم الموبايل</span>
            <input
              inputMode="numeric"
              placeholder="01xxxxxxxxx"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="tel"
              required
            />
          </label>

          <label className="field">
            <span>كلمة المرور</span>
            <input
              type="password"
              minLength={6}
              placeholder="6 أحرف على الأقل"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          <label className="field">
            <span>تأكيد كلمة المرور</span>
            <input
              type="password"
              minLength={6}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          {error && <p className="errorText">{error}</p>}

          <button className="button full" disabled={loading}>
            {loading ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 18 }}>
          لديك حساب بالفعل؟{" "}
          <Link href="/customer/login">تسجيل الدخول</Link>
        </p>
      </section>
    </main>
  );
}
