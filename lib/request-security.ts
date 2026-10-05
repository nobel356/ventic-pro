type Bucket = {
  count: number;
  resetAt: number;
};

type GlobalSecurityState = typeof globalThis & {
  __venticRateLimitStore?: Map<string, Bucket>;
};

function store() {
  const globalState = globalThis as GlobalSecurityState;

  if (!globalState.__venticRateLimitStore) {
    globalState.__venticRateLimitStore = new Map<string, Bucket>();
  }

  return globalState.__venticRateLimitStore;
}

function cleanup(now: number) {
  const current = store();

  if (current.size < 2000) return;

  for (const [key, value] of current) {
    if (value.resetAt <= now) {
      current.delete(key);
    }
  }

  // Protect a warm server instance from unbounded memory growth.
  if (current.size > 5000) {
    const keys = Array.from(current.keys()).slice(0, current.size - 4000);
    for (const key of keys) current.delete(key);
  }
}

export function clientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return (
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export function rateLimit(
  key: string,
  options: {
    limit: number;
    windowMs: number;
  },
) {
  const now = Date.now();
  cleanup(now);

  const current = store();
  const existing = current.get(key);

  if (!existing || existing.resetAt <= now) {
    const next = {
      count: 1,
      resetAt: now + options.windowMs,
    };
    current.set(key, next);

    return {
      allowed: true,
      remaining: Math.max(0, options.limit - 1),
      retryAfterSeconds: Math.ceil(options.windowMs / 1000),
    };
  }

  existing.count += 1;
  current.set(key, existing);

  return {
    allowed: existing.count <= options.limit,
    remaining: Math.max(0, options.limit - existing.count),
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((existing.resetAt - now) / 1000),
    ),
  };
}

export function clearRateLimit(key: string) {
  store().delete(key);
}

export function rateLimitHeaders(result: {
  remaining: number;
  retryAfterSeconds: number;
}) {
  return {
    "Retry-After": String(result.retryAfterSeconds),
    "X-RateLimit-Remaining": String(result.remaining),
  };
}

export function approvalLinkExpired(
  issuedAt: Date | null | undefined,
  maxAgeMs = 7 * 24 * 60 * 60 * 1000,
) {
  if (!issuedAt) return true;
  return Date.now() - issuedAt.getTime() > maxAgeMs;
}
