import "server-only";
import { headers } from "next/headers";
import type { AuditAction, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getClientIp } from "@/lib/request";

export type AuditInput = {
  action: AuditAction;
  userId?: string | null;
  userEmail?: string | null;
  entityType?: string;
  entityId?: string;
  summary?: string;
  metadata?: Prisma.InputJsonValue;
  ip?: string;
  userAgent?: string;
};

/**
 * Record an admin action. Never throws: a logging failure must not break the user's action.
 *   await audit({ action: "PUBLISH", userId: u.id, userEmail: u.email, entityType: "Event", entityId, summary: `Published "${title}"` })
 */
export async function audit(input: AuditInput): Promise<void> {
  try {
    let { ip, userAgent } = input;
    if (!ip || !userAgent) {
      try {
        const h = headers();
        ip ??= getClientIp(h);
        userAgent ??= h.get("user-agent") ?? undefined;
      } catch {
        /* outside a request scope (seed, scripts) */
      }
    }
    await db.auditLog.create({
      data: {
        action: input.action,
        userId: input.userId ?? null,
        userEmail: input.userEmail ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        summary: input.summary,
        metadata: input.metadata,
        ip,
        userAgent: userAgent?.slice(0, 300),
      },
    });
  } catch (err) {
    console.error("[audit] failed to write log", err);
  }
}
