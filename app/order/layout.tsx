import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "طلب تركيب تهوية",
  description:
    "أنشئ طلب تركيب Ventic Pro للحمام أو المطبخ، ارفع صور المكان وحدد الموعد واستلم مقايسة واضحة قبل التنفيذ.",
  alternates: {
    canonical: "/order",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function OrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
