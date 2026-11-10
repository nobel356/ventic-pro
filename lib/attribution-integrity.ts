import {
  type AttributionParts,
  parseAttribution,
} from "@/lib/marketing-analytics";

export type StructuredAttribution = {
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  content?: string | null;
  term?: string | null;
  ref?: string | null;
  landing?: string | null;
  raw?: string | null;
};

export function effectiveAttribution(
  structured: StructuredAttribution,
): AttributionParts & { landing: string } {
  const parsed = parseAttribution(structured.raw);

  return {
    ...parsed,
    source: structured.source || parsed.source,
    medium: structured.medium || parsed.medium,
    campaign: structured.campaign || parsed.campaign,
    content: structured.content || parsed.content,
    term: structured.term || parsed.term,
    ref: structured.ref || parsed.ref,
    landing: structured.landing || "",
  };
}

export function hasStructuredAttribution(
  input: StructuredAttribution,
) {
  return Boolean(
    input.source ||
      input.medium ||
      input.campaign ||
      input.content ||
      input.term ||
      input.ref ||
      input.landing,
  );
}

export function orderAttributionData(input: {
  raw: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  ref: string | null;
  landing: string | null;
}) {
  return {
    acquisitionSource: input.raw,
    attributionSource: input.source,
    attributionMedium: input.medium,
    attributionCampaign: input.campaign,
    attributionContent: input.content,
    attributionTerm: input.term,
    attributionRef: input.ref,
    attributionLanding: input.landing,
  };
}

export function leadAttributionData(input: {
  raw: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  ref: string | null;
  landing: string | null;
}) {
  return {
    source: input.raw,
    attributionSource: input.source,
    attributionMedium: input.medium,
    attributionCampaign: input.campaign,
    attributionContent: input.content,
    attributionTerm: input.term,
    attributionRef: input.ref,
    attributionLanding: input.landing,
  };
}
