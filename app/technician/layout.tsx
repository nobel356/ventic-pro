import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth-v7";
import AccountMenu from "@/app/shared/AccountMenu";
import BackButton from "@/app/shared/BackButton";

export default async function TechnicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "TECHNICIAN") {
    redirect("/admin");
  }

  return (
    <>
      <AccountMenu />
      <BackButton fallbackHref="/technician" />
      {children}
    </>
  );
}
