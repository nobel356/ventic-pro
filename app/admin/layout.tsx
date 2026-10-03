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

  return (
    <div className="vpAdminWorkspace">
      <AdminSidebar
        isSuperAdmin={user.role === "SUPER_ADMIN"}
        canViewInventory={canViewInventory}
        canViewAccounting={canViewAccounting}
        canViewCustomers={canViewCustomers}
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
        }
      `}</style>
    </div>
  );
}
