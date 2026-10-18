import PortfolioGallery from "@/app/shared/PortfolioGallery";

export const metadata = {
  title: "أعمالنا",
  description: "شاهد فيديوهات من تنفيذات Ventic Pro الفعلية.",
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
      <PortfolioGallery />
    </main>
  );
}
