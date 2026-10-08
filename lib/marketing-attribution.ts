const COOKIE_NAME =
  "ventic_attribution";

function clean(value: unknown) {
  return String(value || "")
    .trim()
    .slice(0, 120);
}

function parseCookieHeader(
  cookieHeader: string,
) {
  const parts =
    cookieHeader.split(";");

  for (const part of parts) {
    const [rawName, ...rest] =
      part.trim().split("=");

    if (rawName !== COOKIE_NAME) {
      continue;
    }

    try {
      return JSON.parse(
        decodeURIComponent(
          rest.join("="),
        ),
      ) as Record<
        string,
        unknown
      >;
    } catch {
      return {};
    }
  }

  return {};
}

export function acquisitionSourceFromRequest(
  req: Request,
  manualSource?: unknown,
) {
  const manual = clean(manualSource);
  const cookie =
    req.headers.get("cookie") || "";
  const data =
    parseCookieHeader(cookie);

  const source =
    manual ||
    clean(data.source);
  const medium = clean(data.medium);
  const campaign =
    clean(data.campaign);
  const content =
    clean(data.content);
  const term = clean(data.term);
  const ref = clean(data.ref);

  const details = [
    medium
      ? `medium=${medium}`
      : "",
    campaign
      ? `campaign=${campaign}`
      : "",
    content
      ? `content=${content}`
      : "",
    term ? `term=${term}` : "",
    ref ? `ref=${ref}` : "",
  ].filter(Boolean);

  if (!source && details.length === 0) {
    return null;
  }

  return [
    source || "Direct",
    details.length
      ? `[${details.join("; ")}]`
      : "",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 500);
}
