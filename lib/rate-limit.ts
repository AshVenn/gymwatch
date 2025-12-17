import type { NextRequest } from "next/server"

type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfter: number }

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export function getClientIdentifier(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const realIp = request.headers.get("x-real-ip")?.trim()
  const ip = forwarded || realIp || (request as any).ip || "unknown"
  return ip
}

export function rateLimit(options: { key: string; limit: number; windowMs: number }): RateLimitResult {
  const now = Date.now()
  const entry = buckets.get(options.key)

  if (entry && entry.resetAt <= now) {
    buckets.delete(options.key)
  }

  const current = buckets.get(options.key)
  if (!current) {
    buckets.set(options.key, { count: 1, resetAt: now + options.windowMs })
    return { ok: true, remaining: options.limit - 1 }
  }

  if (current.count >= options.limit) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    return { ok: false, retryAfter }
  }

  current.count += 1
  return { ok: true, remaining: Math.max(options.limit - current.count, 0) }
}
