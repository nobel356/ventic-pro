import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ventic Pro | حلول التهوية والتركيب",
    short_name: "Ventic Pro",
    description:
      "اطلب خدمات التهوية والتركيب وتابع طلبك وفاتورتك وضمانك.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f8fb",
    theme_color: "#0b2f49",
    lang: "ar",
    dir: "rtl",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
