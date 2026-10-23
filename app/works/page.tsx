import type { Metadata } from "next";
import PortfolioGallery from "@/app/shared/PortfolioGallery";

export const metadata: Metadata = {
  title: "أعمالنا",
  description: "شاهد فيديوهات من تنفيذات Ventic Pro الفعلية على YouTube وTikTok.",
  alternates: { canonical: "/works" },
};

export default function WorksPage() {
  return (
    <main
      style={{
        minHeight: "70vh",
        paddingTop: 28,
        paddingBottom: 40,
      }}
    >
      <PortfolioGallery filters />
    </main>
  );
}
