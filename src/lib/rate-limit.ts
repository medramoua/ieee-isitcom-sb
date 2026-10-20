import "server-only";
import { db } from "@/lib/db";

export type RateLimitResult = { ok: boolean; remaining: number; resetAt: Date };

/**
 * Fixed-window rate limiter backed by Postgres (serverless-safe, one atomic upsert).
 *   await rateLimit(`contact:${hashIp(ip)}`, 5, 60 * 60)  // 5 per hour
 * Swap for Upstash later by keeping this signature.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSec * 1000);

  const rows = await db.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
    VALUES (${key}, 1, ${resetAt}::timestamp)
    ON CONFLICT ("key") DO UPDATE SET
      "count"   = CASE WHEN "RateLimitBucket"."resetAt" <= ${now}::timestamp THEN 1
                       ELSE "RateLimitBucket"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= ${now}::timestamp THEN ${resetAt}::timestamp
                       ELSE "RateLimitBucket"."resetAt" END
    RETURNING "count", "resetAt"`;

  const row = rows[0]!;
  // opportunistic cleanup (~1% of calls)
  if (Math.random() < 0.01) {
    void db.rateLimitBucket.deleteMany({ where: { resetAt: { lt: now } } }).catch(() => {});
  }
  return { ok: row.count <= limit, remaining: Math.max(0, limit - row.count), resetAt: row.resetAt };
}
