"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function go(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data?.error || "تعذر تسجيل الدخول");
        return;
      }

      if (data.role === "TECHNICIAN") {
        router.push("/technician");
      } else {
        router.push("/admin");
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="order">
      <section className="panel loginCard">
        <div className="brand center">
          <i>V</i> Ventic Pro
        </div>
        <h1>تسجيل الدخول</h1>
        <p style={{ textAlign: "center", color: "#64748b" }}>
          للإدارة وخدمة العملاء والفنيين
        </p>
        <form onSubmit={go}>
          <label className="field">
            <span>اسم المستخدم أو البريد الإلكتروني</span>
            <input
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>كلمة المرور</span>
            <input
              type="password"
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
      </section>
    </main>
  );
}
