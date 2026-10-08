import { redirect } from "next/navigation";
import {
  can,
  currentUser,
  PERMISSIONS,
} from "@/lib/auth-v7";
import AdminNotificationCenter from "./AdminNotificationCenter";
import AdminSidebar from "./AdminSidebar";
import AccountMenu from "@/app/shared/AccountMenu";
import BackButton from "@/app/shared/BackButton";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "TECHNICIAN") {
    redirect("/technician");
  }

  const canViewInventory = can(
    user.role,
    PERMISSIONS.INVENTORY_VIEW,
    user.permissions,
  );

  const canViewAccounting = can(
    user.role,
    PERMISSIONS.ACCOUNTING_VIEW,
    user.permissions,
  );

  const canViewCustomers =
    can(
      user.role,
      PERMISSIONS.CUSTOMER_SENSITIVE,
      user.permissions,
    ) ||
    can(
      user.role,
      PERMISSIONS.CUSTOMER_ACCOUNTS_EDIT,
      user.permissions,
    );

  const canStocktake = can(
    user.role,
    PERMISSIONS.STOCKTAKE_MANAGE,
    user.permissions,
  );

  const canPurchases =
    can(
      user.role,
      PERMISSIONS.PURCHASES_MANAGE,
      user.permissions,
    ) ||
    can(
      user.role,
      PERMISSIONS.SUPPLIERS_MANAGE,
      user.permissions,
    );

  const canExports = can(
    user.role,
    PERMISSIONS.EXPORTS_VIEW,
    user.permissions,
  );

  const canViewAftercare = can(
    user.role,
    PERMISSIONS.AFTERCARE_VIEW,
    user.permissions,
  );

  const canViewTechnicianPerformance = can(
    user.role,
    PERMISSIONS.TECHNICIAN_PERFORMANCE_VIEW,
    user.permissions,
  );

  const canViewReports = can(
    user.role,
    PERMISSIONS.REPORTS_VIEW,
    user.permissions,
  );

  const canViewProfitability =
    canViewReports &&
    can(
      user.role,
      PERMISSIONS.INVENTORY_COST_VIEW,
      user.permissions,
    );

  const canManageAreas = can(
    user.role,
    PERMISSIONS.AREAS_MANAGE,
    user.permissions,
  );

  const canManagePromotions = can(
    user.role,
    PERMISSIONS.PROMOTIONS_MANAGE,
    user.permissions,
  );

  const canManageLeads = can(
    user.role,
    PERMISSIONS.LEADS_MANAGE,
    user.permissions,
  );

  const canGlobalSearch = can(
    user.role,
    PERMISSIONS.GLOBAL_SEARCH,
    user.permissions,
  );

  const canManageReviews = can(
    user.role,
    PERMISSIONS.REVIEWS_MANAGE,
    user.permissions,
  );

  const canViewArchive = can(
    user.role,
    PERMISSIONS.ARCHIVE_VIEW,
    user.permissions,
  );

  return (
    <div className="vpAdminWorkspace">
      <AdminSidebar
        isSuperAdmin={user.role === "SUPER_ADMIN"}
        canViewInventory={canViewInventory}
        canViewAccounting={canViewAccounting}
        canViewCustomers={canViewCustomers}
        canStocktake={canStocktake}
        canPurchases={canPurchases}
        canExports={canExports}
        canViewAftercare={canViewAftercare}
        canViewTechnicianPerformance={canViewTechnicianPerformance}
        canViewReports={canViewReports}
        canViewProfitability={canViewProfitability}
        canManageAreas={canManageAreas}
        canManagePromotions={canManagePromotions}
        canManageLeads={canManageLeads}
        canGlobalSearch={canGlobalSearch}
        canManageReviews={canManageReviews}
        canViewArchive={canViewArchive}
      />

      <div className="vpAdminContent">
        <AccountMenu />
        <AdminNotificationCenter />
        <BackButton fallbackHref="/admin" />
        {children}
      </div>

      <style>{`
        .vpAdminWorkspace {
          min-height: 100vh;
          background: #f5f8fb;
        }

        .vpAdminSidebar {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 244px;
          z-index: 1200;
          background: #0b2f49;
          color: white;
          border-left: 1px solid rgba(255,255,255,.08);
          box-shadow: -10px 0 30px rgba(15,23,42,.08);
          overflow-y: auto;
          padding: 18px 12px 16px;
        }

        .vpAdminContent {
          min-height: 100vh;
          margin-right: 244px;
          padding-top: 74px;
        }

        .vpAdminLogo {
          display: flex;
          align-items: center;
          gap: 11px;
          min-height: 58px;
          padding: 8px;
          border-radius: 15px;
          color: white;
          text-decoration: none;
          margin-bottom: 14px;
          transition: background .15s ease, transform .15s ease;
        }

        .vpAdminLogo:hover {
          background: rgba(255,255,255,.08);
          transform: translateY(-1px);
        }

        .vpAdminLogoMark {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: #f97316;
          color: white;
          font-size: 23px;
          font-weight: 900;
        }

        .vpAdminLogoText {
          display: grid;
          gap: 2px;
          min-width: 0;
        }

        .vpAdminLogoText strong {
          color: white;
          font-size: 18px;
        }

        .vpAdminLogoText small {
          color: #bfdbfe;
          font-size: 11px;
        }

        .vpAdminNav {
          display: grid;
          gap: 5px;
        }

        .vpAdminNavLink {
          min-height: 45px;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 8px 10px;
          border-radius: 12px;
          color: #dbeafe;
          text-decoration: none;
          font-weight: 800;
          transition: background .15s ease, color .15s ease;
        }

        .vpAdminNavLink:hover {
          background: rgba(255,255,255,.08);
          color: white;
        }

        .vpAdminNavLink.active {
          background: #f97316;
          color: white;
          box-shadow: 0 7px 18px rgba(249,115,22,.24);
        }

        .vpAdminNavIcon {
          width: 28px;
          flex: 0 0 28px;
          display: inline-flex;
          justify-content: center;
          font-size: 18px;
        }

        .vpAdminNavLabel {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .vpAdminSidebarHint {
          margin-top: 18px;
          padding: 12px;
          border-top: 1px solid rgba(255,255,255,.1);
          color: #bfdbfe;
          display: grid;
          gap: 3px;
        }

        .vpAdminSidebarHint span {
          color: white;
          font-weight: 800;
          font-size: 12px;
        }

        .vpAdminSidebarHint small {
          font-size: 10px;
          line-height: 1.5;
        }

        .vpAdminContent > .admin > header {
          display: none !important;
        }

        .vpAdminContent > .adminShell {
          display: block !important;
          min-height: 100vh;
        }

        .vpAdminContent > .adminShell > .adminSide {
          display: none !important;
        }

        .vpAdminContent > .adminShell > .adminMain {
          width: min(1420px, calc(100% - 28px));
          max-width: none !important;
          margin: 0 auto;
          padding-top: 18px;
        }

        .vpAdminContent > .order > .brand.center {
          display: none !important;
        }

        .vpAdminContent {
          overflow-x: hidden;
        }

        .vpAdminContent table {
          border-collapse: collapse;
        }

        .vpAdminContent th,
        .vpAdminContent td {
          padding: 9px 8px;
          vertical-align: top;
        }

        .vpAdminContent th {
          background: #f8fafc;
          color: #334155;
        }

        .vpAdminContent a,
        .vpAdminContent button,
        .vpAdminContent input,
        .vpAdminContent select {
          touch-action: manipulation;
        }

        @media (max-width: 820px) {
          .vpAdminSidebar {
            width: 76px;
            padding: 14px 8px;
          }

          .vpAdminContent {
            margin-right: 76px;
            padding-top: 72px;
          }

          .vpAdminLogo {
            justify-content: center;
            padding: 6px 0;
          }

          .vpAdminLogoText,
          .vpAdminNavLabel,
          .vpAdminSidebarHint {
            display: none;
          }

          .vpAdminNavLink {
            justify-content: center;
            padding: 8px 0;
          }

          .vpAdminNavIcon {
            width: auto;
            flex: 0 0 auto;
          }

          .vpAdminContent > .adminShell > .adminMain {
            width: calc(100% - 18px);
          }

          .vpAdminContent > .admin > section {
            padding-left: 10px !important;
            padding-right: 10px !important;
          }

          .vpAdminContent table {
            font-size: 12px;
          }

          .vpAdminContent th,
          .vpAdminContent td {
            padding: 8px 7px;
          }

          .vpAdminContent button,
          .vpAdminContent a {
            min-height: 40px;
          }

          .vpAdminContent input,
          .vpAdminContent select,
          .vpAdminContent textarea {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
