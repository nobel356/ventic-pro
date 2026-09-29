"use client";

import { useEffect, useState } from "react";
import AccountMenu from "@/app/shared/AccountMenu";

const status: Record<string, string> = {
  ASSIGNED: "تم التعيين",
  ON_THE_WAY: "في الطريق",
  ARRIVED: "وصل",
  IN_PROGRESS: "جاري التنفيذ",
};

export default function Technician() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  const load = () =>
    fetch("/api/technician/orders")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw Error(result.error);
        setData(result);
        setError("");
      })
      .catch((err) => setError(err.message));

  useEffect(() => {
    void load();
  }, []);

  async function change(id: string, nextStatus: string) {
    await fetch(`/api/technician/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    void load();
  }

  return (
    <main className="tech">
      <AccountMenu />
      <header>
        <div className="brand">
          <i>V</i> Ventic Pro
        </div>
        <b>واجهة الفني</b>
      </header>
      <section>
        {error && (
          <div className="errorText">
            {error}
            <small>تأكد من تسجيل الدخول بحساب فني نشط.</small>
          </div>
        )}
        {data && (
          <>
            <div className="techHello">
              <span>أهلاً</span>
              <h1>{data.technician.name}</h1>
              <p>الطلبات المسندة ليك حاليًا</p>
            </div>
            {data.orders.length === 0 ? (
              <div className="empty">لا توجد طلبات نشطة حاليًا.</div>
            ) : (
              data.orders.map((order: any) => (
                <article className="job" key={order.id}>
                  <div className="jobTop">
                    <div>
                      <small>{order.orderNo}</small>
                      <h2>{order.customer.name}</h2>
                    </div>
                    <span>{status[order.status] || order.status}</span>
                  </div>
                  <p>
                    📍 {order.governorate}، {order.area} — {order.address}
                  </p>
                  <p>
                    🗓️ {order.preferredDate} · {order.preferredTime}
                  </p>
                  <a className="phoneBtn" href={`tel:${order.customer.phone}`}>
                    اتصال بالعميل
                  </a>
                  <div className="jobActions">
                    <button onClick={() => void change(order.id, "ON_THE_WAY")}>في الطريق</button>
                    <button onClick={() => void change(order.id, "ARRIVED")}>وصلت</button>
                    <button onClick={() => void change(order.id, "IN_PROGRESS")}>بدأت التركيب</button>
                  </div>
                  <a className="button full" href={`/technician/orders/${order.id}`}>
                    فتح تفاصيل التنفيذ ←
                  </a>
                </article>
              ))
            )}
          </>
        )}
      </section>
    </main>
  );
}
