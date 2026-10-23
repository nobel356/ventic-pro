import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { acquisitionSourceFromRequest } from "@/lib/marketing-attribution";
import {
  clientIp,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/request-security";

const allowedEvents = new Set([
  "page_view",
  "order_intent",
  "callback_intent",
  "whatsapp_click",
  "calculator_view",
  "calculator_estimate",
  "works_play",
  "works_cta",
  "offer_view",
  "referral_visit",
]);

function clean(value: unknown, max = 240) {
  return String(value ?? "").trim().slice(0, max);
}

function cleanDetail(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const source = value as Record<string, unknown>;
  const blocked = new Set([
    "name",
    "phone",
    "email",
    "address",
    "password",
    "otp",
    "token",
  ]);

  const out: Record<string, string | number | boolean | null> = {};

  for (const [key, raw] of Object.entries(source).slice(0, 20)) {
    if (blocked.has(key.toLowerCase())) continue;

    if (typeof raw === "string") {
      out[key.slice(0, 50)] = raw.slice(0, 160);
    } else if (typeof raw === "number" && Number.isFinite(raw)) {
      out[key.slice(0, 50)] = raw;
    } else if (typeof raw === "boolean") {
      out[key.slice(0, 50)] = raw;
    } else if (raw === null) {
      out[key.slice(0, 50)] = null;
    }
  }

  return out;
}

export async function POST(req: Request) {
  try {
    const limited = rateLimit(
      `marketing-event:${clientIp(req)}`,
      {
        limit: 240,
        windowMs: 60 * 60 * 1000,
      },
    );

    if (!limited.allowed) {
      return NextResponse.json(
        { ok: false },
        {
          status: 429,
          headers: rateLimitHeaders(limited),
        },
      );
    }

    const body = await req.json();
    const event = clean(body?.event, 64);

    if (!allowedEvents.has(event)) {
      return NextResponse.json(
        { error: "INVALID_EVENT" },
        { status: 400 },
      );
    }

    const path = clean(body?.path, 240) || "/";
    const sessionId = clean(body?.sessionId, 100) || null;
    const detail = cleanDetail(body?.detail);
    const source = acquisitionSourceFromRequest(req);

    await prisma.auditLog.create({
      data: {
        actorLabel: "زائر الموقع",
        action: "MARKETING_EVENT",
        newValue: {
          event,
          path,
          sessionId,
          source,
          detail,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false },
      { status: 500 },
    );
  }
}
