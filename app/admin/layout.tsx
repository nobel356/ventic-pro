import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth-v7";
import AdminNotificationCenter from "./AdminNotificationCenter";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <AdminNotificationCenter />
      {children}
    </>
  );
}
