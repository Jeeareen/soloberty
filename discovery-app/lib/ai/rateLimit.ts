import { NextResponse } from 'next/server';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitBucket>();

export interface RateLimitOptions {
  route: string;
  maxRequests: number;
  windowMs?: number;
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

export function checkRateLimit(
  req: Request,
  { route, maxRequests, windowMs = 60_000 }: RateLimitOptions
): { limited: boolean; retryAfterSeconds: number; remaining: number } {
  const now = Date.now();
  const key = `${route}:${getClientIp(req)}`;
  const entry = buckets.get(key);

  // Prune expired buckets occasionally to keep memory bounded
  if (buckets.size > 500) {
    for (const [k, v] of buckets.entries()) {
      if (now > v.resetAt) buckets.delete(k);
    }
  }

  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return {
      limited: false,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
      remaining: Math.max(0, maxRequests - 1),
    };
  }

  if (entry.count >= maxRequests) {
    return {
      limited: true,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
      remaining: 0,
    };
  }

  entry.count += 1;
  return {
    limited: false,
    retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    remaining: Math.max(0, maxRequests - entry.count),
  };
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    {
      error: 'RATE_LIMIT',
      message: 'Too many requests right now — please wait a moment and try again.',
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
      },
    }
  );
}
