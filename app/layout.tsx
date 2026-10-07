import "./globals.css";
import SiteChrome from "@/app/shared/SiteChrome";

export const metadata = {
  title: "Ventic Pro | حلول التهوية والتركيب",
  description: "تركيب وتهوية الحمامات والمطابخ",
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        {children}
        <SiteChrome />
      </body>
    </html>
  );
}
