"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  areasPermission?: boolean;
  promotionsPermission?: boolean;
  leadsPermission?: boolean;
  searchPermission?: boolean;
  reviewsPermission?: boolean;
};

const navItems: NavItem[] = [
  { href: "/admin", label: "الرئيسية", icon: "⌂" },
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
    href: "/admin/reports",
    label: "التقارير",
    icon: "📊",
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
  canManageAreas,
  canManagePromotions,
  canManageLeads,
  canGlobalSearch,
  canManageReviews,
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
  canManageAreas: boolean;
  canManagePromotions: boolean;
  canManageLeads: boolean;
  canGlobalSearch: boolean;
  canManageReviews: boolean;
}) {
  const pathname = usePathname();

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

      <nav className="vpAdminNav" aria-label="القائمة الرئيسية">
        {navItems
          .filter((item) => {
            if (item.superAdminOnly && !isSuperAdmin) return false;
            if (item.inventoryPermission && !canViewInventory) {
              return false;
            }
            if (item.accountingPermission && !canViewAccounting) {
              return false;
            }
            if (item.customersPermission && !canViewCustomers) {
              return false;
            }
            if (item.stocktakePermission && !canStocktake) {
              return false;
            }
            if (item.purchasesPermission && !canPurchases) {
              return false;
            }
            if (item.exportsPermission && !canExports) {
              return false;
            }
            if (item.aftercarePermission && !canViewAftercare) {
              return false;
            }
            if (
              item.technicianPerformancePermission &&
              !canViewTechnicianPerformance
            ) {
              return false;
            }
            if (item.reportsPermission && !canViewReports) {
              return false;
            }
            if (item.areasPermission && !canManageAreas) {
              return false;
            }
            if (item.promotionsPermission && !canManagePromotions) {
              return false;
            }
            if (item.leadsPermission && !canManageLeads) {
              return false;
            }
            if (item.searchPermission && !canGlobalSearch) {
              return false;
            }
            if (item.reviewsPermission && !canManageReviews) {
              return false;
            }
            return true;
          })
          .map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`vpAdminNavLink${active ? " active" : ""}`}
                title={item.label}
              >
                <span className="vpAdminNavIcon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="vpAdminNavLabel">{item.label}</span>
              </Link>
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
