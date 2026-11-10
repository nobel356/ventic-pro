"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  superAdminOnly?: boolean;
  inventoryPermission?: boolean;
  accountingPermission?: boolean;
  customersPermission?: boolean;
  stocktakePermission?: boolean;
  purchasesPermission?: boolean;
  exportsPermission?: boolean;
  aftercarePermission?: boolean;
  technicianPerformancePermission?: boolean;
  reportsPermission?: boolean;
  profitabilityPermission?: boolean;
  areasPermission?: boolean;
  promotionsPermission?: boolean;
  leadsPermission?: boolean;
  searchPermission?: boolean;
  reviewsPermission?: boolean;
  blogPermission?: boolean;
  archivePermission?: boolean;
};

const ADMIN_NAV_GROUPS = [
  { key: "overview", label: "نظرة عامة", icon: "🏠" },
  { key: "sales", label: "المبيعات والعملاء", icon: "🧾" },
  { key: "ops", label: "التشغيل والخدمة", icon: "🛠️" },
  { key: "finance", label: "المخزون والمالية", icon: "💰" },
  { key: "growth", label: "التسويق والنمو", icon: "📈" },
  { key: "content", label: "المحتوى وSEO", icon: "📝" },
  { key: "monitoring", label: "التقارير والمراقبة", icon: "📊" },
  { key: "system", label: "إدارة النظام", icon: "⚙️" },
] as const;

type AdminNavGroupKey = (typeof ADMIN_NAV_GROUPS)[number]["key"];

const ADMIN_NAV_STRUCTURE: Record<string, { group: AdminNavGroupKey; sub?: string }> = {
  "/admin": { group: "overview" },
  "/admin/control-center": { group: "overview" },
  "/admin/search": { group: "overview" },

  "/admin/orders": { group: "sales", sub: "الطلبات والعملاء" },
  "/admin/customers": { group: "sales", sub: "الطلبات والعملاء" },
  "/admin/schedule": { group: "sales", sub: "الطلبات والعملاء" },
  "/admin/leads": { group: "sales", sub: "Leads والاسترجاع" },
  "/admin/lead-recovery": { group: "sales", sub: "Leads والاسترجاع" },

  "/admin/technicians": { group: "ops", sub: "الفنيون والتغطية" },
  "/admin/areas": { group: "ops", sub: "الفنيون والتغطية" },
  "/admin/aftercare": { group: "ops", sub: "الجودة وما بعد الخدمة" },
  "/admin/reviews": { group: "ops", sub: "الجودة وما بعد الخدمة" },
  "/admin/work-videos": { group: "ops", sub: "الجودة وما بعد الخدمة" },

  "/admin/inventory": { group: "finance", sub: "المخزون والمشتريات" },
  "/admin/inventory/stocktakes": { group: "finance", sub: "المخزون والمشتريات" },
  "/admin/purchases": { group: "finance", sub: "المخزون والمشتريات" },
  "/admin/pricing": { group: "finance", sub: "التسعير والحسابات" },
  "/admin/accounting": { group: "finance", sub: "التسعير والحسابات" },
  "/admin/profitability": { group: "finance", sub: "التسعير والحسابات" },
  "/admin/exports": { group: "finance", sub: "التسعير والحسابات" },

  "/admin/growth-dashboard": { group: "growth", sub: "Growth OS" },
  "/admin/growth-targets": { group: "growth", sub: "Growth OS" },
  "/admin/growth-funnel": { group: "growth", sub: "Growth OS" },
  "/admin/growth-reviews": { group: "growth", sub: "Growth OS" },
  "/admin/growth-commitments": { group: "growth", sub: "Growth OS" },
  "/admin/marketing-analytics": { group: "growth", sub: "Acquisition & Attribution" },
  "/admin/attribution-health": { group: "growth", sub: "Acquisition & Attribution" },
  "/admin/conversions": { group: "growth", sub: "Acquisition & Attribution" },
  "/admin/marketing": { group: "growth", sub: "Acquisition & Attribution" },
  "/admin/marketing-spend": { group: "growth", sub: "Acquisition & Attribution" },
  "/admin/promotions": { group: "growth", sub: "Offers & Referrals" },
  "/admin/referrals": { group: "growth", sub: "Offers & Referrals" },

  "/admin/blog": { group: "content", sub: "Content" },
  "/admin/content-growth": { group: "content", sub: "Content" },
  "/admin/seo-health": { group: "content", sub: "SEO" },
  "/admin/seo-actions": { group: "content", sub: "SEO" },
  "/admin/cro-experiments": { group: "content", sub: "CRO" },
  "/admin/cro-decisions": { group: "content", sub: "CRO" },

  "/admin/reports": { group: "monitoring", sub: "Reports" },
  "/admin/daily-digest": { group: "monitoring", sub: "Reports" },
  "/admin/notification-health": { group: "monitoring", sub: "System Monitoring" },
  "/admin/system-health": { group: "monitoring", sub: "System Monitoring" },
  "/admin/security-audit": { group: "monitoring", sub: "System Monitoring" },
  "/admin/disaster-recovery": { group: "monitoring", sub: "System Monitoring" },
  "/admin/ops-smoke": { group: "monitoring", sub: "System Monitoring" },
  "/admin/permission-matrix": { group: "monitoring", sub: "System Monitoring" },
  "/admin/launch-center": { group: "monitoring", sub: "System Monitoring" },

  "/admin/users": { group: "system" },
  "/admin/archive": { group: "system" },
};

const navItems: NavItem[] = [
  { href: "/admin", label: "الرئيسية", icon: "⌂" },
  {
    href: "/admin/control-center",
    label: "Control Center",
    icon: "🎛️",
    superAdminOnly: true,
  },
  {
    href: "/admin/growth-dashboard",
    label: "Growth Dashboard",
    icon: "🚀",
    reportsPermission: true,
  },
  {
    href: "/admin/growth-targets",
    label: "Growth Targets",
    icon: "🎯",
    reportsPermission: true,
  },
  {
    href: "/admin/growth-funnel",
    label: "Funnel Leaks",
    icon: "🪣",
    reportsPermission: true,
  },
  {
    href: "/admin/growth-reviews",
    label: "Weekly Growth Review",
    icon: "🗓️",
    reportsPermission: true,
  },
  {
    href: "/admin/growth-commitments",
    label: "Growth Commitments",
    icon: "📌",
    reportsPermission: true,
  },
  {
    href: "/admin/search",
    label: "بحث شامل",
    icon: "🔎",
    searchPermission: true,
  },
  { href: "/admin/orders", label: "الطلبات", icon: "📋" },
  { href: "/admin/schedule", label: "المواعيد", icon: "🗓️" },
  {
    href: "/admin/customers",
    label: "العملاء",
    icon: "👥",
    customersPermission: true,
  },
  {
    href: "/admin/technicians",
    label: "الفنيون",
    icon: "👷",
    technicianPerformancePermission: true,
  },
  {
    href: "/admin/work-videos",
    label: "فيديوهات الأعمال",
    icon: "🎬",
    superAdminOnly: true,
  },
  {
    href: "/admin/inventory",
    label: "المخزون",
    icon: "📦",
    inventoryPermission: true,
  },
  {
    href: "/admin/inventory/stocktakes",
    label: "الجرد",
    icon: "🧮",
    stocktakePermission: true,
  },
  {
    href: "/admin/purchases",
    label: "المشتريات والموردون",
    icon: "🚚",
    purchasesPermission: true,
  },
  { href: "/admin/pricing", label: "الأسعار", icon: "💰" },
  {
    href: "/admin/accounting",
    label: "الحسابات",
    icon: "🧾",
    accountingPermission: true,
  },
  {
    href: "/admin/profitability",
    label: "ربحية الطلبات",
    icon: "💹",
    profitabilityPermission: true,
  },
  {
    href: "/admin/aftercare",
    label: "ما بعد التركيب",
    icon: "🛠️",
    aftercarePermission: true,
  },
  {
    href: "/admin/reviews",
    label: "تقييمات العملاء",
    icon: "⭐",
    reviewsPermission: true,
  },
  {
    href: "/admin/blog",
    label: "المقالات",
    icon: "📝",
    blogPermission: true,
  },
  {
    href: "/admin/reports",
    label: "التقارير",
    icon: "📊",
    reportsPermission: true,
  },
  {
    href: "/admin/marketing-analytics",
    label: "تحليلات التسويق",
    icon: "📈",
    reportsPermission: true,
  },
  {
    href: "/admin/attribution-health",
    label: "Attribution Health",
    icon: "🧭",
    reportsPermission: true,
  },
  {
    href: "/admin/seo-health",
    label: "SEO Health",
    icon: "🩻",
    reportsPermission: true,
  },
  {
    href: "/admin/seo-actions",
    label: "SEO Actions",
    icon: "✅",
    reportsPermission: true,
  },
  {
    href: "/admin/content-growth",
    label: "Content Growth",
    icon: "📈",
    reportsPermission: true,
  },
  {
    href: "/admin/cro-experiments",
    label: "CRO Experiments",
    icon: "🧪",
    blogPermission: true,
  },
  {
    href: "/admin/cro-decisions",
    label: "CRO Decisions",
    icon: "🏁",
    blogPermission: true,
  },
  {
    href: "/admin/conversions",
    label: "Conversion Tracking",
    icon: "🎯",
    reportsPermission: true,
  },
  {
    href: "/admin/areas",
    label: "المناطق",
    icon: "📍",
    areasPermission: true,
  },
  {
    href: "/admin/promotions",
    label: "العروض والكوبونات",
    icon: "🏷️",
    promotionsPermission: true,
  },
  {
    href: "/admin/referrals",
    label: "الإحالات",
    icon: "🔗",
    promotionsPermission: true,
  },
  {
    href: "/admin/exports",
    label: "مركز Excel",
    icon: "📗",
    exportsPermission: true,
  },
  {
    href: "/admin/leads",
    label: "غير المكتملة",
    icon: "🕓",
    leadsPermission: true,
  },
  {
    href: "/admin/lead-recovery",
    label: "Lead Recovery",
    icon: "🔥",
    leadsPermission: true,
  },
  {
    href: "/admin/archive",
    label: "الأرشيف",
    icon: "🗄️",
    archivePermission: true,
  },
  {
    href: "/admin/marketing",
    label: "روابط الحملات",
    icon: "📣",
    superAdminOnly: true,
  },
  {
    href: "/admin/marketing-spend",
    label: "تكلفة الإعلانات",
    icon: "💳",
    superAdminOnly: true,
  },
  {
    href: "/admin/daily-digest",
    label: "الملخص اليومي",
    icon: "🗞️",
    superAdminOnly: true,
  },
  {
    href: "/admin/launch-center",
    label: "Launch Center",
    icon: "🚦",
    superAdminOnly: true,
  },
  {
    href: "/admin/notification-health",
    label: "صحة الرسائل",
    icon: "📨",
    superAdminOnly: true,
  },
  {
    href: "/admin/system-health",
    label: "صحة النظام",
    icon: "🩺",
    superAdminOnly: true,
  },
  {
    href: "/admin/security-audit",
    label: "Security Audit",
    icon: "🛡️",
    superAdminOnly: true,
  },
  {
    href: "/admin/disaster-recovery",
    label: "Backup & DR",
    icon: "💾",
    superAdminOnly: true,
  },
  {
    href: "/admin/ops-smoke",
    label: "Smoke Tests",
    icon: "🧪",
    reportsPermission: true,
  },
  {
    href: "/admin/permission-matrix",
    label: "Permission Matrix",
    icon: "🔏",
    superAdminOnly: true,
  },
  {
    href: "/admin/users",
    label: "المستخدمون",
    icon: "🔐",
    superAdminOnly: true,
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebar({
  isSuperAdmin,
  canViewInventory,
  canViewAccounting,
  canViewCustomers,
  canStocktake,
  canPurchases,
  canExports,
  canViewAftercare,
  canViewTechnicianPerformance,
  canViewReports,
  canViewProfitability,
  canManageAreas,
  canManagePromotions,
  canManageLeads,
  canGlobalSearch,
  canManageReviews,
  canManageBlog,
  canViewArchive,
}: {
  isSuperAdmin: boolean;
  canViewInventory: boolean;
  canViewAccounting: boolean;
  canViewCustomers: boolean;
  canStocktake: boolean;
  canPurchases: boolean;
  canExports: boolean;
  canViewAftercare: boolean;
  canViewTechnicianPerformance: boolean;
  canViewReports: boolean;
  canViewProfitability: boolean;
  canManageAreas: boolean;
  canManagePromotions: boolean;
  canManageLeads: boolean;
  canGlobalSearch: boolean;
  canManageReviews: boolean;
  canManageBlog: boolean;
  canViewArchive: boolean;
}) {
  const pathname = usePathname();

  const [navSearch, setNavSearch] = useState("");
  const [pinnedHrefs, setPinnedHrefs] = useState<string[]>([]);
  const [recentHrefs, setRecentHrefs] = useState<string[]>([]);

  useEffect(() => {
    try {
      setPinnedHrefs(
        JSON.parse(localStorage.getItem("vp_admin_pins") || "[]"),
      );
      setRecentHrefs(
        JSON.parse(localStorage.getItem("vp_admin_recent") || "[]"),
      );
    } catch {
      setPinnedHrefs([]);
      setRecentHrefs([]);
    }
  }, []);

  useEffect(() => {
    if (!pathname.startsWith("/admin")) return;

    setRecentHrefs((current) => {
      const next = [
        pathname,
        ...current.filter((href) => href !== pathname),
      ].slice(0, 5);

      try {
        localStorage.setItem("vp_admin_recent", JSON.stringify(next));
      } catch {}

      return next;
    });
  }, [pathname]);

  const visibleItems = navItems.filter((item) => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (item.inventoryPermission && !canViewInventory) return false;
    if (item.accountingPermission && !canViewAccounting) return false;
    if (item.customersPermission && !canViewCustomers) return false;
    if (item.stocktakePermission && !canStocktake) return false;
    if (item.purchasesPermission && !canPurchases) return false;
    if (item.exportsPermission && !canExports) return false;
    if (item.aftercarePermission && !canViewAftercare) return false;
    if (item.technicianPerformancePermission && !canViewTechnicianPerformance) return false;
    if (item.reportsPermission && !canViewReports) return false;
    if (item.profitabilityPermission && !canViewProfitability) return false;
    if (item.areasPermission && !canManageAreas) return false;
    if (item.promotionsPermission && !canManagePromotions) return false;
    if (item.leadsPermission && !canManageLeads) return false;
    if (item.searchPermission && !canGlobalSearch) return false;
    if (item.reviewsPermission && !canManageReviews) return false;
    if (item.blogPermission && !canManageBlog) return false;
    if (item.archivePermission && !canViewArchive) return false;
    return true;
  });

  const currentItem =
    visibleItems.find(
      (item) => isActive(pathname, item.href),
    ) || null;

  const searchItems = useMemo(() => {
    const query = navSearch.trim().toLowerCase();
    if (!query) return [];

    return visibleItems
      .filter((item) =>
        (item.label + " " + item.href)
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 12);
  }, [navSearch, visibleItems]);

  const pinnedItems = pinnedHrefs
    .map((href) => visibleItems.find((item) => item.href === href))
    .filter(Boolean) as NavItem[];

  const recentItems = recentHrefs
    .map((href) => visibleItems.find((item) => item.href === href))
    .filter(Boolean)
    .slice(0, 5) as NavItem[];

  const toggleCurrentPin = () => {
    if (!currentItem) return;

    setPinnedHrefs((current) => {
      const exists = current.includes(currentItem.href);
      const next = exists
        ? current.filter((href) => href !== currentItem.href)
        : [currentItem.href, ...current].slice(0, 8);

      try {
        localStorage.setItem("vp_admin_pins", JSON.stringify(next));
      } catch {}

      return next;
    });
  };

  const itemLink = (item: NavItem, nested = false) => {
    const active = isActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`vpAdminNavLink${active ? " active" : ""}${nested ? " nested" : ""}`}
        title={item.label}
      >
        <span className="vpAdminNavIcon" aria-hidden="true">{item.icon}</span>
        <span className="vpAdminNavLabel">{item.label}</span>
      </Link>
    );
  };

  return (
    <aside className="vpAdminSidebar" dir="rtl">
      <Link
        href="/admin"
        className="vpAdminLogo"
        title="العودة للشاشة الرئيسية"
        aria-label="العودة للشاشة الرئيسية"
      >
        <span className="vpAdminLogoMark">V</span>
        <span className="vpAdminLogoText">
          <strong>Ventic Pro</strong>
          <small>لوحة التشغيل</small>
        </span>
      </Link>

      <section className="vpAdminPowerTools">
        <input
          value={navSearch}
          onChange={(event) => setNavSearch(event.target.value)}
          placeholder="ابحث في لوحة التحكم..."
          className="vpAdminNavSearch"
        />

        {currentItem && (
          <button
            type="button"
            onClick={toggleCurrentPin}
            className="vpAdminPinButton"
          >
            {pinnedHrefs.includes(currentItem.href)
              ? "★ إزالة من المفضلة"
              : "☆ تثبيت الصفحة الحالية"}
          </button>
        )}

        {navSearch.trim() && (
          <div className="vpAdminQuickBlock">
            <small>نتائج البحث</small>
            {searchItems.length
              ? searchItems.map((item) => itemLink(item))
              : <span className="vpAdminQuickEmpty">لا توجد نتائج</span>}
          </div>
        )}

        {!navSearch.trim() && pinnedItems.length > 0 && (
          <div className="vpAdminQuickBlock">
            <small>المفضلة</small>
            {pinnedItems.map((item) => itemLink(item))}
          </div>
        )}

        {!navSearch.trim() && recentItems.length > 0 && (
          <details className="vpAdminRecent">
            <summary>آخر الصفحات</summary>
            <div>
              {recentItems.map((item) => itemLink(item))}
            </div>
          </details>
        )}
      </section>

      <nav className="vpAdminNav" aria-label="القائمة الرئيسية">
        {ADMIN_NAV_GROUPS.map((group) => {
          const groupItems = visibleItems.filter(
            (item) => ADMIN_NAV_STRUCTURE[item.href]?.group === group.key,
          );
          if (groupItems.length === 0) return null;

          const active = groupItems.some((item) => isActive(pathname, item.href));
          const subNames = Array.from(
            new Set(
              groupItems
                .map((item) => ADMIN_NAV_STRUCTURE[item.href]?.sub)
                .filter(Boolean) as string[],
            ),
          );
          const directItems = groupItems.filter(
            (item) => !ADMIN_NAV_STRUCTURE[item.href]?.sub,
          );

          return (
            <details
              key={group.key}
              className={`vpAdminNavGroup${active ? " active" : ""}`}
              open={active || group.key === "overview"}
            >
              <summary className="vpAdminNavGroupSummary">
                <span className="vpAdminNavIcon" aria-hidden="true">{group.icon}</span>
                <span className="vpAdminNavLabel">{group.label}</span>
                <span className="vpAdminNavChevron" aria-hidden="true">▾</span>
              </summary>

              <div className="vpAdminNavGroupBody">
                {directItems.map((item) => itemLink(item))}

                {subNames.map((subName) => {
                  const subItems = groupItems.filter(
                    (item) => ADMIN_NAV_STRUCTURE[item.href]?.sub === subName,
                  );

                  return (
                    <section key={subName} className="vpAdminNavSubGroup">
                      <div className="vpAdminNavSubTitle">{subName}</div>
                      {subItems.map((item) => itemLink(item, true))}
                    </section>
                  );
                })}
              </div>
            </details>
          );
        })}
      </nav>

      <div className="vpAdminSidebarHint">
        <span>Ventic Pro</span>
        <small>كل أقسام التشغيل من مكان واحد</small>
      </div>
    </aside>
  );
}
