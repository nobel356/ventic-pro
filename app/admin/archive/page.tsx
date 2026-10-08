import { redirect } from "next/navigation";
import {
  archiveActorFor,
} from "@/lib/archive-vault";
import {
  PERMISSIONS,
} from "@/lib/permission-config";
import ArchiveVaultClient from "./ArchiveVaultClient";

export default async function ArchivePage() {
  const actor =
    await archiveActorFor(
      PERMISSIONS.ARCHIVE_VIEW,
    );

  if (!actor) {
    redirect("/admin");
  }

  return (
    <main
      className="admin"
      dir="rtl"
    >
      <section
        style={{
          maxWidth: 1360,
          margin: "0 auto",
          padding:
            "26px 18px 70px",
        }}
      >
        <div
          style={{
            marginBottom: 18,
          }}
        >
          <h1
            style={{
              marginBottom: 6,
            }}
          >
            Archive Vault
          </h1>
          <p
            style={{
              color: "#64748b",
              margin: 0,
              lineHeight: 1.8,
            }}
          >
            العناصر المحذوفة من التشغيل تظل محفوظة هنا ويمكن استرجاعها حسب الصلاحيات.
            فتح الخزنة يحتاج كلمة سر إضافية مستقلة عن كلمة سر الحساب.
          </p>
        </div>

        <ArchiveVaultClient />
      </section>
    </main>
  );
}
