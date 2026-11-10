const COOKIE_NAME = "ventic_attribution";

function clean(value: unknown) {
  return String(value || "").trim().slice(0, 120);
}

function parseCookieHeader(cookieHeader: string) {
  const parts = cookieHeader.split(";");

  for (const part of parts) {
    const [rawName, ...rest] = part.trim().split("=");

    if (rawName !== COOKIE_NAME) continue;

    try {
      return JSON.parse(
        decodeURIComponent(rest.join("=")),
      ) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  return {};
}

export type AttributionSnapshot = {
  raw: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  ref: string | null;
  landing: string | null;
};

export function attributionSnapshotFromRequest(
  req: Request,
  manualSource?: unknown,
): AttributionSnapshot {
  const manual = clean(manualSource);
  const cookie = req.headers.get("cookie") || "";
  const data = parseCookieHeader(cookie);

  const source = manual || clean(data.source);
  const medium = clean(data.medium);
  const campaign = clean(data.campaign);
  const content = clean(data.content);
  const term = clean(data.term);
  const ref = clean(data.ref);
  const landing = clean(data.landing);

  const details = [
    medium ? `medium=${medium}` : "",
    campaign ? `campaign=${campaign}` : "",
    content ? `content=${content}` : "",
    term ? `term=${term}` : "",
    ref ? `ref=${ref}` : "",
  ].filter(Boolean);

  const raw =
    !source && details.length === 0
      ? null
      : [
          source || "Direct",
          details.length ? `[${details.join("; ")}]` : "",
        ]
          .filter(Boolean)
          .join(" ")
          .slice(0, 500);

  return {
    raw,
    source: source || null,
    medium: medium || null,
    campaign: campaign || null,
    content: content || null,
    term: term || null,
    ref: ref || null,
    landing: landing || null,
  };
}

export function acquisitionSourceFromRequest(
  req: Request,
  manualSource?: unknown,
) {
  return attributionSnapshotFromRequest(req, manualSource).raw;
}
