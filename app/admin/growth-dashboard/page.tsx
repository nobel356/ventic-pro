import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";
import { loadReferralCodes } from "@/lib/referrals";

export const dynamic = "force-dynamic";

function money(value: unknown) {
  return Number(value || 0).toLocaleString("ar-EG", {
    maximumFractionDigits: 0,
  });
}

function payloadObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export default async function GrowthDashboardPage() {
  try {
    await requirePermission(PERMISSIONS.REPORTS_VIEW);
  } catch {
    redirect("/admin");
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [orders, leads, events, referrals] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: since } },
      select: {
        id: true,
        status: true,
        estimatedTotal: true,
        finalTotal: true,
        invoice: { select: { total: true, paid: true } },
        spaces: {
          select: {
            services: {
              select: { serviceNameSnapshot: true },
            },
          },
        },
      },
    }),
    prisma.lead.findMany({
      where: { createdAt: { gte: since } },
      select: {
        status: true,
        payload: true,
        consentToFollowUp: true,
      },
    }),
    prisma.auditLog.findMany({
      where: {
        action: "MARKETING_EVENT",
        createdAt: { gte: since },
      },
      select: { newValue: true },
      take: 5000,
    }),
    loadReferralCodes(prisma),
  ]);

  const completed = orders.filter((item) => item.status === "COMPLETED").length;
  const cancelled = orders.filter((item) => item.status === "CANCELLED").length;
  const invoiced = orders.reduce(
    (sum, item) => sum + Number(item.invoice?.total || item.finalTotal || item.estimatedTotal || 0),
    0,
  );
  const paid = orders.reduce((sum, item) => sum + Number(item.invoice?.paid || 0), 0);
  const convertedLeads = leads.filter((item) => item.status === "CONVERTED").length;
  const callbacks = leads.filter((item) => String(payloadObject(item.payload).intent || "") === "CALLBACK").length;
  const activeReferralUses = referrals.reduce((sum, item) => sum + item.uses, 0);

  const eventCounts = new Map<string, number>();
  for (const row of events) {
    const value = payloadObject(row.newValue);
    const event = String(value.event || "unknown");
    eventCounts.set(event, (eventCounts.get(event) || 0) + 1);
  }

  const serviceCounts = new Map<string, number>();
  for (const order of orders) {
    for (const space of order.spaces) {
      for (const service of space.services) {
        const name = service.serviceNameSnapshot;
        serviceCounts.set(name, (serviceCounts.get(name) || 0) + 1);
      }
    }
  }

  const topServices = [...serviceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const leadConversion = leads.length ? (convertedLeads / leads.length) * 100 : 0;
  const completionRate = orders.length ? (completed / orders.length) * 100 : 0;

  return (
    <main className="admin" dir="rtl">
      <section style={{ maxWidth: 1250, margin: "0 auto", padding: "24px 18px 70px" }}>
        <div style={headStyle}>
          <div>
            <h1 style={{ marginBottom: 6 }}>Growth Dashboard</h1>
            <p style={{ color: "#64748b", marginTop: 0 }}>
              صورة تنفيذية مختصرة لآخر 30 يوم: Leads، تحويل، طلبات، تحصيل، تفاعل، وإحالات.
            </p>
          </div>
          <Link href="/admin/marketing-analytics" style={linkStyle}>تحليلات التسويق المتقدمة</Link>
        </div>

        <div style={statsStyle}>
          <Stat label="Leads" value={leads.length} meta={`تحويل ${leadConversion.toFixed(1)}%`} />
          <Stat label="طلبات" value={orders.length} meta={`إكمال ${completionRate.toFixed(1)}%`} />
          <Stat label="طلبات اتصال" value={callbacks} />
          <Stat label="قيمة مسجلة" value={`${money(invoiced)} ج`} />
          <Stat label="محصل" value={`${money(paid)} ج`} />
          <Stat label="استخدامات إحالة" value={activeReferralUses} />
          <Stat label="WhatsApp clicks" value={eventCounts.get("whatsapp_click") || 0} />
          <Stat label="حاسبة السعر" value={eventCounts.get("calculator_estimate") || 0} />
        </div>

        <div style={twoColStyle}>
          <Panel title="أعلى الخدمات">
            {topServices.length ? topServices.map(([name, count]) => (
              <Row key={name} label={name} value={count} />
            )) : <p style={{ color: "#64748b" }}>لا توجد بيانات كافية.</p>}
          </Panel>

          <Panel title="مؤشرات التشغيل">
            <Row label="مكتمل" value={completed} />
            <Row label="ملغي" value={cancelled} />
            <Row label="Conversion events" value={events.length} />
            <Row label="Referral codes" value={referrals.length} />
          </Panel>
        </div>

        <section style={{ ...panelStyle, marginTop: 16 }}>
          <h2 style={{ marginTop: 0 }}>انتقال سريع</h2>
          <div style={quickGrid}>
            <Quick href="/admin/lead-recovery" label="Lead Recovery" />
            <Quick href="/admin/conversions" label="Conversions" />
            <Quick href="/admin/referrals" label="Referrals" />
            <Quick href="/admin/reviews" label="Reviews" />
            <Quick href="/admin/marketing-analytics" label="Marketing Analytics" />
            <Quick href="/admin/security-audit" label="Security Audit" />
          </div>
        </section>
      </section>
    </main>
  );
}

function Stat({ label, value, meta }: { label: string; value: string | number; meta?: string }) {
  return (
    <div style={statStyle}>
      <b style={{ fontSize: 23, color: "#0f2d4a" }}>{value}</b>
      <span style={{ color: "#64748b", fontSize: 12 }}>{label}</span>
      {meta && <small style={{ color: "#94a3b8" }}>{meta}</small>}
    </div>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section style={panelStyle}><h2 style={{ marginTop: 0 }}>{title}</h2>{children}</section>;
}
function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, borderBottom: "1px solid #eef2f7", padding: "9px 0" }}>
      <span>{label}</span><strong>{value}</strong>
    </div>
  );
}
function Quick({ href, label }: { href: string; label: string }) {
  return <Link href={href} style={quickLink}>{label}</Link>;
}

const headStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" };
const statsStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 10, margin: "18px 0" };
const statStyle: React.CSSProperties = { background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: 14, display: "grid", gap: 4 };
const twoColStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16 };
const panelStyle: React.CSSProperties = { background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 18 };
const quickGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 };
const quickLink: React.CSSProperties = { minHeight: 42, display: "grid", placeItems: "center", border: "1px solid #cbd5e1", borderRadius: 10, background: "#f8fafc", color: "#0f2d4a", textDecoration: "none", fontWeight: 900 };
const linkStyle: React.CSSProperties = { minHeight: 40, display: "inline-flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: 9, padding: "0 12px", color: "#0f2d4a", background: "white", textDecoration: "none", fontWeight: 900 };
