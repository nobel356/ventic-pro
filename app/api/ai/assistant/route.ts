import { generateText } from "ai";
import { NextResponse } from "next/server";
import {
  assistantFallbackReply,
  assistantPrompt,
  cleanAssistantText,
  type AgentHistoryItem,
  VENTIC_AGENT_SYSTEM_PROMPT,
} from "@/lib/ai/ventic-agent";
import {
  clientIp,
  durableRateLimit,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/request-security";
import {
  safeDiagnostic,
  safeDiagnosticError,
} from "@/lib/safe-diagnostics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const HOUR_MS = 60 * 60 * 1000;

function cleanPath(value: unknown) {
  const raw = String(value || "/")
    .trim()
    .slice(0, 180);

  if (!raw.startsWith("/")) {
    return "/";
  }

  return raw.split("?")[0] || "/";
}

function cleanHistory(value: unknown): AgentHistoryItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(-6)
    .map((item) => {
      const role =
        item?.role === "assistant"
          ? "assistant"
          : "user";

      const text = cleanAssistantText(
        item?.text,
        650,
      );

      return {
        role,
        text,
      } satisfies AgentHistoryItem;
    })
    .filter((item) => item.text.length > 0);
}

async function checkRateLimit(req: Request) {
  const ip = clientIp(req);
  const key = `public-ai:${ip}`;

  try {
    return await durableRateLimit(key, {
      limit: 30,
      windowMs: HOUR_MS,
    });
  } catch (error) {
    safeDiagnosticError(
      "ai.rate_limit.durable_fallback",
      error,
    );

    return rateLimit(key, {
      limit: 20,
      windowMs: HOUR_MS,
    });
  }
}

export async function POST(req: Request) {
  const limited = await checkRateLimit(req);

  if (!limited.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "تم الوصول للحد المؤقت للمساعد. استخدم طلب الاتصال أو واتساب لو محتاج متابعة الآن.",
      },
      {
        status: 429,
        headers: rateLimitHeaders(limited),
      },
    );
  }

  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "الطلب غير صالح.",
      },
      { status: 400 },
    );
  }

  const message = cleanAssistantText(
    body?.message,
    700,
  );

  if (message.length < 2) {
    return NextResponse.json(
      {
        ok: false,
        error: "اكتب سؤالك الأول.",
      },
      { status: 400 },
    );
  }

  const history = cleanHistory(
    body?.history,
  );

  const path = cleanPath(
    body?.path,
  );

  const fallback =
    assistantFallbackReply(message);

  if (
    String(
      process.env.AI_AGENT_ENABLED ||
        "false",
    ).toLowerCase() !== "true"
  ) {
    return NextResponse.json({
      ok: true,
      source: "fallback",
      reply: fallback,
    });
  }

  const model = String(
    process.env.AI_GATEWAY_MODEL ||
      "openai/gpt-5.6-luna",
  ).trim();

  try {
    const result = await generateText({
      model,
      system:
        VENTIC_AGENT_SYSTEM_PROMPT,
      prompt: assistantPrompt({
        path,
        history,
        message,
      }),
      maxOutputTokens: 420,
      temperature: 0.2,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(12_000),
    });

    const reply = cleanAssistantText(
      result.text,
      1800,
    );

    if (!reply) {
      throw new Error(
        "AI_EMPTY_RESPONSE",
      );
    }

    safeDiagnostic(
      "ai.customer_assistant.complete",
      {
        model,
        finishReason:
          result.finishReason,
        historyItems:
          history.length,
        path,
      },
    );

    return NextResponse.json({
      ok: true,
      source: "ai",
      reply,
    });
  } catch (error) {
    safeDiagnosticError(
      "ai.customer_assistant.fallback",
      error,
    );

    return NextResponse.json({
      ok: true,
      source: "fallback",
      reply: fallback,
    });
  }
}
