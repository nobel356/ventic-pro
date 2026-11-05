"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CustomerRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get("phone");
    const mail = params.get("email");

    if (value) setPhone(value);
    if (mail) setEmail(mail);
  }, []);

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

    if (!legalAccepted) {
      setError("يجب الموافقة على الشروط وسياسة الخصوصية.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/customer/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email,
          password,
          legalAccepted,
        }),
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
        <Link href="/" className="brand center" style={{ textDecoration: "none" }}>
          <i>V</i> Ventic Pro
        </Link>

        <h1 style={{ textAlign: "center" }}>إنشاء حساب عميل</h1>
        <p style={{ textAlign: "center", color: "#64748b" }}>
          كل طلباتك وفواتيرك وضمانك في حساب واحد، مع نسخة بريد إلكتروني للتحديثات المهمة.
        </p>

        <form onSubmit={register}>
          <label className="field">
            <span>الاسم</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          </label>

          <label className="field">
            <span>رقم الموبايل</span>
            <input inputMode="numeric" placeholder="01xxxxxxxxx" value={phone}
              onChange={(e) => setPhone(e.target.value)} autoComplete="tel" required />
          </label>

          <label className="field">
            <span>البريد الإلكتروني</span>
            <input type="email" placeholder="name@example.com" value={email}
              onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </label>

          <label className="field">
            <span>كلمة المرور</span>
            <input type="password" minLength={6} placeholder="6 أحرف على الأقل"
              value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password" required />
          </label>

          <label className="field">
            <span>تأكيد كلمة المرور</span>
            <input type="password" minLength={6} value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password" required />
          </label>

          <label className="consent" style={{ margin: "12px 0" }}>
            <input type="checkbox" checked={legalAccepted}
              onChange={(e) => setLegalAccepted(e.target.checked)} />
            <span>
              أوافق على <Link href="/legal/terms" target="_blank">الشروط والأحكام</Link>
              {" "}و<Link href="/legal/privacy" target="_blank">سياسة الخصوصية</Link>.
            </span>
          </label>

          {error && <p className="errorText">{error}</p>}

          <button className="button full" disabled={loading}>
            {loading ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 18 }}>
          لديك حساب بالفعل؟ <Link href="/customer/login">تسجيل الدخول</Link>
        </p>
      </section>
    </main>
  );
}
