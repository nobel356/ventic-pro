import fs from "node:fs";

const conversion =
  fs.readFileSync(
    "lib/client-conversion.ts",
    "utf8",
  );
const pixel =
  fs.readFileSync(
    "lib/tiktok-pixel.ts",
    "utf8",
  );
const tracking =
  fs.readFileSync(
    "app/shared/TrackingManager.tsx",
    "utf8",
  );
const callback =
  fs.readFileSync(
    "app/callback/CallbackClient.tsx",
    "utf8",
  );
const order =
  fs.readFileSync(
    "app/order/page.tsx",
    "utf8",
  );

const checks = [
  [
    pixel.includes(
      "marketingConsentGranted",
    ) &&
      pixel.includes(
        "analytics.tiktok.com/i18n/pixel/events.js",
      ),
    "direct TikTok pixel with marketing consent",
  ],
  [
    conversion.includes(
      "trackTikTokStandardEvent",
    ) &&
      !conversion.includes(
        "ventic_tiktok_conversion",
      ),
    "no TikTok GTM dataLayer bridge",
  ],
  [
    conversion.includes(
      '"InitiateCheckout"',
    ) &&
      conversion.includes(
        '"Lead"',
      ) &&
      conversion.includes(
        '"Contact"',
      ) &&
      conversion.includes(
        '"ViewContent"',
      ),
    "standard event mapping",
  ],
  [
    tracking.includes(
      "grantTikTokConsent",
    ) &&
      tracking.includes(
        "revokeTikTokConsent",
      ) &&
      tracking.includes(
        "trackTikTokPage",
      ),
    "consent lifecycle and page tracking",
  ],
  [
    callback.includes(
      '"callback_submitted"',
    ) &&
      order.includes(
        '"order_started"',
      ) &&
      order.includes(
        '"order_submitted"',
      ),
    "lead and order funnel events",
  ],
  [
    !conversion.includes(
      "customerPhone",
    ) &&
      !conversion.includes(
        "customerEmail",
      ) &&
      !pixel.includes(
        "identify(",
      ),
    "no customer PII or advanced matching",
  ],
];

const failed =
  checks.filter(
    ([ok]) => !ok,
  );

if (failed.length) {
  console.error(
    "V22-B TikTok direct tracking check failed:",
  );

  for (const [
    ,
    label,
  ] of failed) {
    console.error(
      `- ${label}`,
    );
  }

  process.exit(1);
}

console.log(
  "PASS ✓ — Direct Pixel ✓ / Marketing Consent ✓ / ViewContent ✓ / InitiateCheckout ✓ / Contact ✓ / Lead ✓ / GTM Bridge OFF ✓ / No PII ✓",
);
