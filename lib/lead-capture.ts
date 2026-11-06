export type LeadRequestType =
  | ""
  | "QUICK_REQUEST"
  | "DETAILED_ENTRY";

export function leadRequestTypeFromPayload(
  payload: Record<string, unknown>,
): LeadRequestType {
  const value = String(
    payload?.requestType || "",
  ).trim();

  if (
    value === "QUICK_CONTACT"
  ) {
    return "QUICK_REQUEST";
  }

  return value === "QUICK_REQUEST" ||
    value === "DETAILED_ENTRY"
    ? value
    : "";
}
