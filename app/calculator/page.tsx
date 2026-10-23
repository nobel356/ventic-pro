import type { Metadata } from "next";
import CalculatorClient from "./CalculatorClient";

export const metadata: Metadata = {
  title: "حاسبة السعر التقديري",
  description:
    "احسب سعرًا تقديريًا لخدمات Ventic Pro من الأسعار الحالية قبل بدء طلب التركيب.",
  alternates: { canonical: "/calculator" },
};

export default function CalculatorPage() {
  return <CalculatorClient />;
}
