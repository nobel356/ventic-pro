import fs from "node:fs";

const conversion =
  fs.readFileSync(
    "lib/client-conversion.ts",
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

function extractTrackBlock(
  source,
  eventName,
) {
  const eventMarker =
    `"${eventName}"`;

  const eventAt =
    source.indexOf(
      eventMarker,
    );

  if (eventAt < 0) {
    return "";
  }

  const start =
    source.lastIndexOf(
      "trackConversion(",
      eventAt,
    );

  if (start < 0) {
    return "";
  }

  const end =
    source.indexOf(
      "\n                    );",
      eventAt,
    );

  if (end >= 0) {
    return source.slice(
      start,
      end + 24,
    );
  }

  const fallbackEnd =
    source.indexOf(
      "\n      );",
      eventAt,
    );

  return fallbackEnd >= 0
    ? source.slice(
        start,
        fallbackEnd + 10,
      )
    : source.slice(
        start,
        eventAt + 600,
      );
}

const callbackTrack =
  extractTrackBlock(
    callback,
    "callback_submitted",
  );

const orderStartedTrack =
  extractTrackBlock(
    order,
    "order_started",
  );

const orderSubmittedTrack =
  extractTrackBlock(
    order,
    "order_submitted",
  );

const piiPattern =
  /cleanPhone|cleanName|customerPhone|customerEmail|\bphone\s*:|\bemail\s*:|\bname\s*:/;

const checks = [
  [
    conversion.includes(
      "marketingConsentGranted",
    ) &&
      conversion.includes(
        "ventic_tiktok_conversion",
      ),
    "TikTok marketing-consent gate",
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
    "TikTok standard event mapping",
  ],
  [
    callbackTrack.includes(
      '"callback_submitted"',
    ),
    "callback success event",
  ],
  [
    orderStartedTrack.includes(
      '"order_started"',
    ) &&
      orderSubmittedTrack.includes(
        '"order_submitted"',
      ) &&
      orderSubmittedTrack.includes(
        '"EGP"',
      ),
    "order funnel success events",
  ],
  [
    Boolean(callbackTrack) &&
      Boolean(orderSubmittedTrack) &&
      !piiPattern.test(
        callbackTrack,
      ) &&
      !piiPattern.test(
        orderSubmittedTrack,
      ),
    "no customer PII in conversion events",
  ],
];

const failed =
  checks.filter(
    ([ok]) => !ok,
  );

if (failed.length) {
  console.error(
    "V22-A TikTok tracking check failed:",
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
  "PASS ✓ — TikTok Consent Gate ✓ / Lead ✓ / InitiateCheckout ✓ / Contact ✓ / ViewContent ✓ / No PII ✓",
);
