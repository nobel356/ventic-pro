import "./globals.css";
import type { Metadata, Viewport } from "next";
import SiteChrome from "@/app/shared/SiteChrome";
import PwaInstallPrompt from "@/app/shared/PwaInstallPrompt";
import MarketingAttribution from "@/app/shared/MarketingAttribution";
import SeoJsonLd from "@/app/shared/SeoJsonLd";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://ventic-pro-v11-7.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Ventic Pro | حلول التهوية والتركيب",
    template: "%s | Ventic Pro",
  },
  description:
    "خدمات تركيب وتهوية الحمامات والمطابخ والهود وخطوط الطرد. اطلب الخدمة أونلاين وارفع صور المكان وتابع طلبك خطوة بخطوة.",
  applicationName: "Ventic Pro",
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "ar_EG",
    url: "/",
    siteName: "Ventic Pro",
    title: "Ventic Pro | حلول التهوية والتركيب",
    description:
      "اطلب خدمة التهوية والتركيب أونلاين وتابع طلبك حتى الإتمام والضمان.",
  },
  twitter: {
    card: "summary",
    title: "Ventic Pro | حلول التهوية والتركيب",
    description:
      "تهوية وتركيب للحمامات والمطابخ والهود مع متابعة وتوثيق كامل.",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f2d4a",
  colorScheme: "light",
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <MarketingAttribution />
        <SeoJsonLd />
        {children}
        <SiteChrome />
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
