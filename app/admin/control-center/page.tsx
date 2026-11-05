import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth-v7";
import ControlCenterClient from "./ControlCenterClient";

export default async function ControlCenterPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "SUPER_ADMIN") {
    redirect("/admin");
  }

  return <ControlCenterClient />;
}
