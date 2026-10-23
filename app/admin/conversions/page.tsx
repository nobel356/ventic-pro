import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";

export const dynamic = "force-dynamic";

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

const eventLabels: Record<string, string> = {
  page_view: "مشاهدة صفحة مهمة",
  order_intent: "نية بدء طلب",
  callback_intent: "طلب/فتح مكالمة",
  whatsapp_click: "ضغط واتساب",
  calculator_view: "فتح الحاسبة",
  calculator_estimate: "حساب سعر",
  works_play: "تشغيل عمل سابق",
  works_cta: "طلب تنفيذ مشابه",
  offer_view: "مشاهدة عرض",
  referral_visit: "زيارة إحالة",
};

export default async function ConversionsPage() {
  try {
    await requirePermission(PERMISSIONS.REPORTS_VIEW);
  } catch {
    redirect("/admin");
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const logs = await prisma.auditLog.findMany({
    where: {
      action: "MARKETING_EVENT",
      createdAt: { gte: since },
    },
    select: {
      newValue: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const eventMap = new Map<string, number>();
  const pathMap = new Map<string, number>();
  const sourceMap = new Map<string, number>();
  const sessions = new Set<string>();

  for (const log of logs) {
    const value = objectValue(log.newValue);
    const event = String(value.event || "unknown");
    const path = String(value.path || "/");
    const source = String(value.source || "Direct");
    const sessionId = String(value.sessionId || "");

    eventMap.set(event, (eventMap.get(event) || 0) + 1);
    pathMap.set(path, (pathMap.get(path) || 0) + 1);
    sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
    if (sessionId) sessions.add(sessionId);
  }

  const events = [...eventMap.entries()].sort((a, b) => b[1] - a[1]);
  const paths = [...pathMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  const sources = [...sourceMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);

  return (
    <main className="admin" dir="rtl">
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 18px 70px" }}>
        <h1 style={{ marginBottom: 6 }}>Conversion Tracking</h1>
        <p style={{ color: "#64748b", marginTop: 0 }}>
          أحداث التحويل الداخلية لآخر 30 يوم. لا يتم تخزين اسم أو هاتف أو بريد داخل هذه الأحداث.
        </p>

        <div style={statsStyle}>
          <Stat label="إجمالي الأحداث" value={logs.length} />
          <Stat label="Sessions مرصودة" value={sessions.size} />
          <Stat label="ضغط واتساب" value={eventMap.get("whatsapp_click") || 0} />
          <Stat label="نية طلب" value={eventMap.get("order_intent") || 0} />
          <Stat label="حساب سعر" value={eventMap.get("calculator_estimate") || 0} />
        </div>

        <div style={twoColStyle}>
          <Panel title="الأحداث">
            {events.map(([event, count]) => (
              <Row key={event} label={eventLabels[event] || event} value={count} />
            ))}
          </Panel>

          <Panel title="أكثر الصفحات تفاعلًا">
            {paths.map(([path, count]) => (
              <Row key={path} label={path} value={count} />
            ))}
          </Panel>
        </div>

        <Panel title="المصادر" wide>
          {sources.map(([source, count]) => (
            <Row key={source} label={source} value={count} />
          ))}
        </Panel>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={statStyle}>
      <b style={{ fontSize: 24, color: "#0f2d4a" }}>{value}</b>
      <span style={{ color: "#64748b", fontSize: 12 }}>{label}</span>
    </div>
  );
}

function Panel({ title, children, wide = false }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <section style={{ ...panelStyle, ...(wide ? { marginTop: 16 } : {}) }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <div style={{ display: "grid", gap: 7 }}>{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, borderBottom: "1px solid #eef2f7", padding: "8px 0" }}>
      <span>{label}</span>
      <strong style={{ color: "#0f2d4a" }}>{value}</strong>
    </div>
  );
}

const statsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
  gap: 10,
  margin: "18px 0",
};
const statStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 14,
  display: "grid",
  gap: 4,
};
const twoColStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
  gap: 16,
};
const panelStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 18,
};
