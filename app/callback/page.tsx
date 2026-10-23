import type { Metadata } from "next";
import CallbackClient from "./CallbackClient";

export const metadata: Metadata = {
  title: "اطلب مكالمة",
  description:
    "سيب اسمك ورقمك وفريق Ventic Pro يتواصل معاك بخصوص خدمات التهوية والتركيب.",
};

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
