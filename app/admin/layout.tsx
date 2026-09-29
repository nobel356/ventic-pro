import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth-v7";
import AdminNotificationCenter from "./AdminNotificationCenter";
import AccountMenu from "@/app/shared/AccountMenu";

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

  return (
    <>
      <AccountMenu />
      <AdminNotificationCenter />
      {children}
    </>
  );
}
