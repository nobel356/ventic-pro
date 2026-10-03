"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function CustomerLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/customer/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "تعذر تسجيل الدخول");
      }

      router.push("/customer/account");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "تعذر تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="order" dir="rtl">
      <section className="panel loginCard" style={{ maxWidth: 480 }}>
        <Link
          href="/"
          className="brand center"
          style={{ textDecoration: "none" }}
        >
          <i>V</i> Ventic Pro
        </Link>

        <h1 style={{ textAlign: "center" }}>حساب العميل</h1>
        <p style={{ textAlign: "center", color: "#64748b" }}>
          تابع طلباتك ومواعيدك وفواتيرك من مكان واحد.
        </p>

        <form onSubmit={login}>
          <label className="field">
            <span>رقم الموبايل</span>
            <input
              inputMode="numeric"
              autoComplete="tel"
              placeholder="01xxxxxxxxx"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>كلمة المرور</span>
            <input
              type="password"
              minLength={6}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error && <p className="errorText">{error}</p>}

          <button className="button full" disabled={loading}>
            {loading ? "جاري الدخول..." : "دخول"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 18 }}>
          ليس لديك حساب؟{" "}
          <Link href="/customer/register">إنشاء حساب</Link>
        </p>
      </section>
    </main>
  );
}
