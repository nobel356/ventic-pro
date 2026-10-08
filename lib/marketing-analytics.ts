export type AttributionParts = {
  raw: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
  ref: string;
};

function clean(value: unknown) {
  return String(value || "").trim();
}

export function parseAttribution(
  value: unknown,
): AttributionParts {
  const raw = clean(value);

  if (!raw) {
    return {
      raw: "",
      source: "غير معروف / مباشر",
      medium: "",
      campaign: "",
      content: "",
      term: "",
      ref: "",
    };
  }

  const match = raw.match(
    /^([^\[]*?)(?:\s*\[(.*)\])?$/,
  );
  const source =
    clean(match?.[1]) ||
    "غير معروف / مباشر";
  const details = clean(match?.[2]);

  const map: Record<string, string> = {};

  if (details) {
    details
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => {
        const index = item.indexOf("=");

        if (index <= 0) return;

        const key = item
          .slice(0, index)
          .trim()
          .toLowerCase();
        const itemValue = item
          .slice(index + 1)
          .trim();

        if (key && itemValue) {
          map[key] = itemValue;
        }
      });
  }

  return {
    raw,
    source,
    medium: map.medium || "",
    campaign: map.campaign || "",
    content: map.content || "",
    term: map.term || "",
    ref: map.ref || "",
  };
}

export function moneyNumber(
  value: unknown,
) {
  const result = Number(value || 0);
  return Number.isFinite(result)
    ? result
    : 0;
}

export function percent(
  numerator: number,
  denominator: number,
) {
  if (!denominator) return 0;

  return (
    (numerator / denominator) *
    100
  );
}

export function cairoDayKey(
  value: Date,
) {
  try {
    return value.toLocaleDateString(
      "en-CA",
      {
        timeZone: "Africa/Cairo",
      },
    );
  } catch {
    return value
      .toISOString()
      .slice(0, 10);
  }
}
