import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";

export const dynamic = "force-dynamic";

function payloadObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function ageHours(date: Date) {
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 3600000));
}

export default async function LeadRecoveryPage() {
  try {
    await requirePermission(PERMISSIONS.LEADS_MANAGE);
  } catch {
    redirect("/admin");
  }

  const leads = await prisma.lead.findMany({
    where: {
      archivedAt: null,
      status: { in: ["STARTED", "CONTACTED", "ABANDONED"] },
    },
    orderBy: { lastActivityAt: "desc" },
    take: 400,
  });

  const rows = leads
    .map((lead) => {
      const payload = payloadObject(lead.payload);
      const intent = String(payload.intent || "");
      const service = String(payload.service || "");
      const requestType = String(payload.requestType || "");
      const hours = ageHours(lead.lastActivityAt);

      let score = 0;
      if (intent === "CALLBACK") score += 50;
      score += lead.currentStep * 8;
      if (hours <= 6) score += 25;
      else if (hours <= 24) score += 15;
      else if (hours > 72) score -= 15;
      if (lead.consentToFollowUp) score += 10;
      if (lead.status === "ABANDONED") score += 5;

      return {
        lead,
        intent,
        service,
        requestType,
        hours,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  const hot = rows.filter((row) => row.score >= 65).length;
  const stale = rows.filter((row) => row.hours > 72).length;
  const callbacks = rows.filter((row) => row.intent === "CALLBACK").length;

  return (
    <main className="admin" dir="rtl">
      <section style={{ maxWidth: 1300, margin: "0 auto", padding: "24px 18px 70px" }}>
        <div style={headStyle}>
          <div>
            <h1 style={{ marginBottom: 6 }}>Lead Recovery</h1>
            <p style={{ color: "#64748b", marginTop: 0 }}>
              ترتيب العملاء حسب أولوية المتابعة بدل عرضهم بترتيب زمني فقط.
            </p>
          </div>
          <Link href="/admin/leads" style={actionLink}>إدارة المتابعات</Link>
        </div>

        <div style={statsStyle}>
          <Stat label="إجمالي مفتوح" value={rows.length} />
          <Stat label="أولوية عالية" value={hot} danger={hot > 0} />
          <Stat label="طلبات اتصال" value={callbacks} />
          <Stat label="أقدم من 72 ساعة" value={stale} danger={stale > 0} />
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {rows.map(({ lead, intent, service, requestType, hours, score }) => {
            const hotRow = score >= 65;
            return (
              <article key={lead.id} style={{ ...cardStyle, ...(hotRow ? hotStyle : {}) }}>
                <div style={{ minWidth: 220 }}>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
                    <strong style={{ color: "#071a2b", fontSize: 17 }}>
                      {lead.name || "عميل بدون اسم"}
                    </strong>
                    {hotRow && <span style={hotBadge}>HOT</span>}
                    {intent === "CALLBACK" && <span style={callbackBadge}>طلب مكالمة</span>}
                  </div>
                  <div style={{ color: "#64748b", marginTop: 5 }}>
                    {lead.phone || "بدون رقم"} — آخر نشاط منذ {hours} ساعة
                  </div>
                </div>

                <div style={detailGrid}>
                  <Detail label="الخطوة" value={`${lead.currentStep}/4`} />
                  <Detail label="الخدمة" value={service || "غير محددة"} />
                  <Detail label="نوع الرحلة" value={requestType || "طلب عادي"} />
                  <Detail label="المصدر" value={lead.source || "Direct"} />
                  <Detail label="الحالة" value={lead.status} />
                  <Detail label="موافقة التواصل" value={lead.consentToFollowUp ? "نعم" : "لا"} />
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {lead.phone && lead.consentToFollowUp && (
                    <a href={`tel:${lead.phone}`} style={primaryLink}>اتصال الآن</a>
                  )}
                  <Link href="/admin/leads" style={actionLink}>فتح المتابعة</Link>
                </div>
              </article>
            );
          })}

          {rows.length === 0 && <div style={cardStyle}>لا توجد Leads مفتوحة حاليًا.</div>}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <div style={statStyle}>
      <b style={{ fontSize: 24, color: danger ? "#b91c1c" : "#0f2d4a" }}>{value}</b>
      <span style={{ color: "#64748b", fontSize: 12 }}>{label}</span>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <small style={{ color: "#94a3b8" }}>{label}</small>
      <strong style={{ display: "block", marginTop: 2, color: "#334155", fontSize: 13 }}>{value}</strong>
    </div>
  );
}

const headStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};
const statsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
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
const cardStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 15,
  padding: 14,
  display: "grid",
  gridTemplateColumns: "minmax(220px,1fr) minmax(360px,2fr) auto",
  gap: 14,
  alignItems: "center",
};
const hotStyle: React.CSSProperties = {
  borderColor: "#fdba74",
  background: "#fffaf5",
};
const detailGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
  gap: 8,
};
const hotBadge: React.CSSProperties = {
  background: "#ffedd5",
  color: "#9a3412",
  borderRadius: 999,
  padding: "4px 7px",
  fontSize: 10,
  fontWeight: 900,
};
const callbackBadge: React.CSSProperties = {
  ...hotBadge,
  background: "#dbeafe",
  color: "#1d4ed8",
};
const actionLink: React.CSSProperties = {
  minHeight: 38,
  display: "inline-flex",
  alignItems: "center",
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  padding: "0 11px",
  textDecoration: "none",
  color: "#0f2d4a",
  background: "white",
  fontWeight: 900,
};
const primaryLink: React.CSSProperties = {
  ...actionLink,
  border: 0,
  background: "#0f2d4a",
  color: "white",
};
