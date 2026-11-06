import fs from "node:fs";

const route = fs.readFileSync(
  "app/api/ai/assistant/route.ts",
  "utf8",
);

const component = fs.readFileSync(
  "app/shared/AiAssistant.tsx",
  "utf8",
);

const agent = fs.readFileSync(
  "lib/ai/ventic-agent.ts",
  "utf8",
);

const layout = fs.readFileSync(
  "app/layout.tsx",
  "utf8",
);

const privacy = fs.readFileSync(
  "app/legal/privacy/page.tsx",
  "utf8",
);

const pkg = JSON.parse(
  fs.readFileSync(
    "package.json",
    "utf8",
  ),
);

function hasStartsWithPath(
  source,
  path,
) {
  const escaped = path.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );

  return new RegExp(
    `pathname\\.startsWith\\(\\s*["']${escaped}["']\\s*,?\\s*\\)`,
  ).test(source);
}

const checks = [
  [
    Boolean(
      pkg.dependencies?.ai,
    ),
    "AI SDK dependency",
  ],
  [
    route.includes(
      "generateText",
    ) &&
      route.includes(
        "AI_GATEWAY_MODEL",
      ),
    "AI Gateway model routing",
  ],
  [
    !route.includes(
      "OPENAI_API_KEY",
    ) &&
      !route.includes(
        "@ai-sdk/openai",
      ) &&
      !agent.includes(
        "OPENAI_API_KEY",
      ),
    "no direct provider key",
  ],
  [
    route.includes(
      "durableRateLimit",
    ) &&
      route.includes(
        "public-ai:",
      ),
    "durable rate limit",
  ],
  [
    route.includes(
      "cleanAssistantText",
    ) &&
      agent.includes(
        "رقم موبايل محجوب",
      ) &&
      agent.includes(
        "بريد إلكتروني محجوب",
      ),
    "PII scrubbing",
  ],
  [
    !route.includes(
      '@/lib/prisma',
    ) &&
      !route.includes(
        "prisma.",
      ),
    "no direct DB/order access",
  ],
  [
    route.includes(
      'source: "fallback"',
    ) &&
      route.includes(
        'source: "ai"',
      ),
    "safe fallback path",
  ],
  [
    component.includes(
      "ما تبعتش رقم موبايل",
    ) &&
      !component.includes(
        "localStorage",
      ) &&
      !component.includes(
        "sessionStorage",
      ),
    "ephemeral client chat",
  ],
  [
    hasStartsWithPath(
      component,
      "/admin",
    ) &&
      hasStartsWithPath(
        component,
        "/technician",
      ) &&
      hasStartsWithPath(
        component,
        "/customer/account",
      ),
    "sensitive surfaces hidden",
  ],
  [
    layout.includes(
      "<AiAssistant />",
    ),
    "assistant mounted",
  ],
  [
    privacy.includes(
      "المساعد الذكي",
    ) &&
      privacy.includes(
        "Vercel AI Gateway",
      ),
    "privacy disclosure",
  ],
  [
    agent.includes(
      "لا تخترع أسعارًا",
    ) &&
      agent.includes(
        "لا تطلب كلمات مرور أو OTP",
      ),
    "commercial and security guardrails",
  ],
];

const failed =
  checks.filter(
    ([ok]) => !ok,
  );

if (failed.length) {
  for (
    const [, label] of failed
  ) {
    console.error(
      "FAIL:",
      label,
    );
  }

  process.exit(1);
}

console.log(
  "PASS ✓ — AI Gateway ✓ / Read-only ✓ / Rate Limit ✓ / PII Scrub ✓ / No Chat Storage ✓ / Sensitive Surfaces Hidden ✓ / Fallback ✓ / Privacy ✓",
);
