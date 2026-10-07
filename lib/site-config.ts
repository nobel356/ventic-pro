export const siteConfig = {
  brand: "Ventic Pro",
  legalName:
    process.env
      .NEXT_PUBLIC_LEGAL_NAME ||
    "Ventic Pro",
  supportEmail:
    process.env
      .NEXT_PUBLIC_SUPPORT_EMAIL ||
    "",
  supportPhone:
    process.env
      .NEXT_PUBLIC_SUPPORT_PHONE ||
    "",
  whatsappNumber:
    process.env
      .NEXT_PUBLIC_WHATSAPP_NUMBER ||
    "",
  facebook:
    process.env
      .NEXT_PUBLIC_FACEBOOK_URL ||
    "",
  instagram:
    process.env
      .NEXT_PUBLIC_INSTAGRAM_URL ||
    "",
  tiktok:
    process.env
      .NEXT_PUBLIC_TIKTOK_URL ||
    "",
  youtube:
    process.env
      .NEXT_PUBLIC_YOUTUBE_URL ||
    "",
  policyVersion:
    "2026-10-07",
};
