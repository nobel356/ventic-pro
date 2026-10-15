import Link from "next/link";
import { redirect } from "next/navigation";
import {
  archiveActorFor,
} from "@/lib/archive-vault";
import {
  PERMISSIONS,
} from "@/lib/permission-config";
import ArchiveVaultClient from "./ArchiveVaultClient";
import ArchivePurgePanel from "./ArchivePurgePanel";

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
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          <div>
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
              العناصر المؤرشفة تظل محفوظة ويمكن استرجاعها حسب الصلاحيات.
              الاسترجاع والحذف النهائي يحتاجان فتح الخزنة.
            </p>
          </div>

          {actor.role ===
            "SUPER_ADMIN" && (
            <Link
              href="/admin/archive/reset"
              style={{
                minHeight: 40,
                display: "inline-flex",
                alignItems: "center",
                textDecoration: "none",
                border:
                  "1px solid #cbd5e1",
                borderRadius: 10,
                background: "white",
                color: "#0f2d4a",
                padding: "0 12px",
                fontWeight: 900,
              }}
            >
              نسيت كلمة سر الأرشيف؟
            </Link>
          )}
        </div>

        <ArchiveVaultClient />

        <ArchivePurgePanel />
      </section>
    </main>
  );
}
