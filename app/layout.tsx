import "./globals.css";
import "./brand-theme.css";
import "./brand-v14d.css";
import "./iphone.css";
import "./scroll-fix.css";
import "./navigation-v18.css";
import "./growth-v18b.css";
import "./a11y-v19.css";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import SiteChrome from "@/app/shared/SiteChrome";
import PwaInstallPrompt from "@/app/shared/PwaInstallPrompt";
import MarketingAttribution from "@/app/shared/MarketingAttribution";
import SeoJsonLd from "@/app/shared/SeoJsonLd";
import PortfolioPortal from "@/app/shared/PortfolioPortal";
import GrowthAssist from "@/app/shared/GrowthAssist";
import AiAssistant from "@/app/shared/AiAssistant";
import QrQuickAccess from "@/app/shared/QrQuickAccess";
import ReferralBanner from "@/app/shared/ReferralBanner";
import ConversionTracker from "@/app/shared/ConversionTracker";
import TrustBar from "@/app/shared/TrustBar";
import CalculatorOrderSummary from "@/app/shared/CalculatorOrderSummary";
import TrackingManager from "@/app/shared/TrackingManager";
import WebVitalsReporter from "@/app/shared/WebVitalsReporter";
import RuntimeSiteGate from "@/app/shared/RuntimeSiteGate";
import {
  getRuntimeControl,
  sanitizeRuntimeControl,
} from "@/lib/runtime-control";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://ventic-pro.com";

const gtmId =
  String(process.env.NEXT_PUBLIC_GTM_ID || "").trim();

const googleVerification =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined;

const bingVerification =
  process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || undefined;

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
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: googleVerification,
    other: bingVerification
      ? {
          "msvalidate.01": bingVerification,
        }
      : undefined,
  },
  appleWebApp: {
    capable: true,
    title: "Ventic Pro",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    type: "website",
    locale: "ar_EG",
    url: "/",
    siteName: "Ventic Pro",
    title: "Ventic Pro | حلول التهوية والتركيب",
    description:
      "اطلب خدمة التهوية والتركيب أونلاين وتابع طلبك حتى الإتمام والضمان.",
    images: [
      {
        url: "/social-preview.png",
        width: 1200,
        height: 630,
        alt: "Ventic Pro - حلول التهوية والتركيب",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ventic Pro | حلول التهوية والتركيب",
    description:
      "تهوية وتركيب للحمامات والمطابخ والهود مع متابعة وتوثيق كامل.",
    images: ["/social-preview.png"],
  },
  icons: {
    icon: [
      {
        url: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        url: "/favicon.ico",
      },
    ],
    apple: [
      {
        url: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b2f49",
  colorScheme: "light",
};

function gtmBootstrap(containerId: string) {
  return `
(function(w,d,s,l,i){
  w[l]=w[l]||[];
  w.gtag=w.gtag||function(){w[l].push(arguments);};

  w.gtag('consent','default',{
    analytics_storage:'denied',
    ad_storage:'denied',
    ad_user_data:'denied',
    ad_personalization:'denied'
  });

  w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});

  var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),
      dl=l!='dataLayer'?'&l='+l:'';

  j.async=true;
  j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
  f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${containerId.replace(
    /[^A-Za-z0-9_-]/g,
    "",
  )}');
`;
}

function runtimeFromHeader(
  value: string | null,
) {
  if (!value) return null;

  try {
    return sanitizeRuntimeControl(
      JSON.parse(
        decodeURIComponent(value),
      ),
    );
  } catch {
    return null;
  }
}

function bypassRuntimeLock(
  pathname: string,
) {
  return (
    pathname === "/login" ||
    pathname === "/callback" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/technician")
  );
}

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders =
    await headers();
  const pathname =
    requestHeaders.get(
      "x-ventic-pathname",
    ) || "/";

  const middlewareRuntime =
    runtimeFromHeader(
      requestHeaders.get(
        "x-ventic-runtime-control",
      ),
    );

  const runtimeControl =
    middlewareRuntime ||
    (
      await getRuntimeControl()
    ).control;

  const hardLocked =
    requestHeaders.get(
      "x-ventic-runtime-lock",
    ) === "1" ||
    (
      !bypassRuntimeLock(
        pathname,
      ) &&
      runtimeControl.mode !==
        "NORMAL"
    );

  return (
    <html lang="ar" dir="rtl">
      <head>
        <link
          rel="alternate"
          type="application/rss+xml"
          title="دليل التهوية - Ventic Pro"
          href="/feed.xml"
        />
        {!hardLocked && gtmId ? (
          <script
            id="ventic-gtm-bootstrap"
            dangerouslySetInnerHTML={{
              __html: gtmBootstrap(gtmId),
            }}
          />
        ) : null}
      </head>

      <body>
        {!hardLocked && gtmId ? (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(
                gtmId,
              )}`}
              height={0}
              width={0}
              style={{
                display: "none",
                visibility: "hidden",
              }}
              title="Google Tag Manager"
            />
          </noscript>
        ) : null}

        {!hardLocked ? (
          <a
            href="#main-content"
            className="vpSkipLink"
          >
            تخطي للمحتوى
          </a>
        ) : null}

        {hardLocked ? (
          <RuntimeSiteGate
            initialRuntime={
              runtimeControl
            }
            hardLocked
          >
            {null}
          </RuntimeSiteGate>
        ) : (
          <RuntimeSiteGate
            initialRuntime={
              runtimeControl
            }
          >
            <TrackingManager />
            <WebVitalsReporter />
            <MarketingAttribution />
            <ConversionTracker />
            <ReferralBanner />
            <SeoJsonLd />
            <TrustBar />
            <CalculatorOrderSummary />

            <div id="main-content">
              {children}
            </div>

            <PortfolioPortal />
            <SiteChrome />
            <GrowthAssist />
            <AiAssistant />
            <QrQuickAccess />
            <PwaInstallPrompt />
          </RuntimeSiteGate>
        )}
      </body>
    </html>
  );
}
