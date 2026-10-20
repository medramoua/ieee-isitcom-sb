import "server-only";
import { createHash } from "crypto";
import { env } from "@/env";

type HeaderBag = { get(name: string): string | null } | Record<string, string | string[] | undefined>;

function read(h: HeaderBag, name: string): string | undefined {
  if ("get" in h && typeof h.get === "function") return h.get(name) ?? undefined;
  const v = (h as Record<string, string | string[] | undefined>)[name];
  return Array.isArray(v) ? v[0] : v;
}

export const getHeader = read;

/** Client IP. On Vercel, x-forwarded-for is set by the platform and can be trusted. */
export function getClientIp(h: HeaderBag): string {
  const xff = read(h, "x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return read(h, "x-real-ip") ?? "unknown";
}

/** Salted hash so rate-limit / abuse tables never store raw IPs. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`${ip}:${env.NEXTAUTH_SECRET}`).digest("hex").slice(0, 32);
}

/** Same-origin check for mutating route handlers (CSRF defence-in-depth, alongside SameSite cookies). */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false; // browsers always send Origin on POST/PUT/DELETE
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
