import { redirect } from "next/navigation";
import { archiveActorFor } from "@/lib/archive-vault";
import ArchiveRecoveryClient from "./ArchiveRecoveryClient";

export default async function ArchiveResetPage() {
  const actor =
    await archiveActorFor();

  if (!actor) {
    redirect("/login");
  }

  if (
    actor.role !==
    "SUPER_ADMIN"
  ) {
    redirect("/admin");
  }

  return (
    <main
      className="admin"
      dir="rtl"
      style={{
        padding:
          "26px 18px 70px",
      }}
    >
      <ArchiveRecoveryClient />
    </main>
  );
}
