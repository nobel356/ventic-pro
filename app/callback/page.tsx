import type { Metadata } from "next";
import CallbackClient from "./CallbackClient";

function callbackTopic(service: string) {
  if (service.includes("الحمام")) return "تهوية الحمام";
  if (service.includes("المطبخ")) return "تهوية المطبخ";
  if (service.includes("الهود")) return "الهود وخط الطرد";
  if (service.includes("منطقة الخدمة")) return "منطقة الخدمة";
  return "";
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const rawService = Array.isArray(params?.service)
    ? params.service[0]
    : params?.service;
  const service = String(rawService || "").trim().slice(0, 120);
  const topic = callbackTopic(service);

  return {
    title: topic ? `اطلب مكالمة عن ${topic}` : "اطلب مكالمة",
    description: topic
      ? `سيب اسمك ورقمك وفريق Ventic Pro يتواصل معاك بخصوص ${topic} ويشرح لك الخطوة المناسبة للمكان.`
      : "سيب اسمك ورقمك وفريق Ventic Pro يتواصل معاك بخصوص خدمات التهوية والتركيب.",
    alternates: {
      canonical: "/callback",
    },
    robots: {
      index: false,
      follow: true,
    },
  };
}

type SearchParams = Promise<{
  service?: string | string[];
}>;

export default async function CallbackPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const rawService = Array.isArray(params?.service)
    ? params.service[0]
    : params?.service;

  const service = String(rawService || "")
    .trim()
    .slice(0, 120);

  return <CallbackClient service={service} />;
}
