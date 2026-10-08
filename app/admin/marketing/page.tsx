import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth-v7";
import MarketingLinkBuilder from "./MarketingLinkBuilder";

export default async function MarketingPage() {
  const user =
    await currentUser();

  if (!user) {
    redirect("/login");
  }

  if (
    user.role !==
    "SUPER_ADMIN"
  ) {
    redirect("/admin");
  }

  return (
    <main
      className="admin"
      dir="rtl"
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        padding: "18px 14px 60px",
      }}
    >
      <h1>
        روابط الحملات التسويقية
      </h1>
      <p
        style={{
          color: "#64748b",
        }}
      >
        اعمل رابط مختلف لكل إعلان. Ventic Pro يحفظ مصدر الحملة تلقائيًا مع الـLead والأوردر.
      </p>
      <MarketingLinkBuilder />
    </main>
  );
}
