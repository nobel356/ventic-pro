export type VenticConsent = {
  version: 1;
  analytics: boolean;
  marketing: boolean;
  updatedAt: number;
};

export const VENTIC_CONSENT_KEY =
  "ventic_privacy_consent_v1";

export const VENTIC_CONSENT_EVENT =
  "ventic:consent-changed";

export function readConsent(): VenticConsent | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(VENTIC_CONSENT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<VenticConsent>;

    if (
      parsed.version !== 1 ||
      typeof parsed.analytics !== "boolean" ||
      typeof parsed.marketing !== "boolean"
    ) {
      return null;
    }

    return {
      version: 1,
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      updatedAt: Number(parsed.updatedAt || 0),
    };
  } catch {
    return null;
  }
}

export function writeConsent(input: {
  analytics: boolean;
  marketing: boolean;
}) {
  if (typeof window === "undefined") return;

  const value: VenticConsent = {
    version: 1,
    analytics: Boolean(input.analytics),
    marketing: Boolean(input.marketing),
    updatedAt: Date.now(),
  };

  try {
    window.localStorage.setItem(
      VENTIC_CONSENT_KEY,
      JSON.stringify(value),
    );
  } catch {
    // Consent UI must continue to function even when storage is blocked.
  }

  window.dispatchEvent(
    new CustomEvent(VENTIC_CONSENT_EVENT, {
      detail: value,
    }),
  );
}

export function analyticsConsentGranted() {
  return readConsent()?.analytics === true;
}

export function marketingConsentGranted() {
  return readConsent()?.marketing === true;
}

export function anyTrackingConsentGranted() {
  const consent = readConsent();
  return Boolean(consent?.analytics || consent?.marketing);
}
