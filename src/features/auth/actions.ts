"use server";

import { createHash, randomBytes } from "crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { env } from "@/env";
import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/features/auth/session";
import { sendEmail } from "@/lib/email/send";
import { passwordResetEmail } from "@/lib/email/templates";
import { hashPassword, verifyPassword } from "@/features/auth/password";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, hashIp } from "@/lib/request";
import { changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from "@/features/auth/validators";

type Result = { ok: true } | { ok: false; error: string };

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const firstIssue = (e: { issues: { message: string }[] }) => e.issues[0]?.message ?? "Données invalides";

/** Always answers the same way, whether the email exists or not (no account enumeration). */
export async function requestPasswordReset(input: unknown): Promise<Result> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const ip = getClientIp(headers());
  const rl = await rateLimit(`reset:ip:${hashIp(ip)}`, 5, 60 * 60);
  if (!rl.ok) return { ok: false, error: "Trop de demandes. Réessayez dans une heure." };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (user?.isActive) {
    const token = randomBytes(32).toString("base64url");
    await db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await db.passwordResetToken.create({
      data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    const url = `${env.NEXT_PUBLIC_SITE_URL}/admin/reset-password?token=${token}`;
    await sendEmail({
      to: user.email,
      ...passwordResetEmail(url),
      template: "password-reset",
      relatedType: "User",
      relatedId: user.id,
    });
  }
  return { ok: true };
}

export async function resetPassword(input: unknown): Promise<Result> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const ip = getClientIp(headers());
  const rl = await rateLimit(`resetconfirm:ip:${hashIp(ip)}`, 10, 60 * 60);
  if (!rl.ok) return { ok: false, error: "Trop de tentatives. Réessayez plus tard." };

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: sha256(parsed.data.token) },
    include: { user: { select: { id: true, email: true, isActive: true } } },
  });
  if (!record || record.usedAt || record.expiresAt < new Date() || !record.user.isActive) {
    return { ok: false, error: "Lien invalide ou expiré. Refaites une demande." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash, failedLogins: 0, lockedUntil: null, mustChangePassword: false },
    }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.passwordResetToken.deleteMany({ where: { userId: record.userId, id: { not: record.id } } }),
  ]);
  await audit({
    action: "PASSWORD_CHANGE",
    userId: record.user.id,
    userEmail: record.user.email,
    summary: "Password reset via email link",
  });
  return { ok: true };
}

export async function changePassword(input: unknown): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { ok: false, error: "Session expirée. Reconnectez-vous." };

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const rl = await rateLimit(`changepw:${session.id}`, 10, 60 * 60);
  if (!rl.ok) return { ok: false, error: "Trop de tentatives. Réessayez plus tard." };

  const user = await db.user.findUnique({ where: { id: session.id } });
  if (!user || !user.isActive) return { ok: false, error: "Compte introuvable." };

  if (!(await verifyPassword(parsed.data.current, user.passwordHash))) {
    return { ok: false, error: "Mot de passe actuel incorrect." };
  }
  if (parsed.data.current === parsed.data.password) {
    return { ok: false, error: "Le nouveau mot de passe doit être différent de l'actuel." };
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.password), mustChangePassword: false },
  });
  await audit({ action: "PASSWORD_CHANGE", userId: user.id, userEmail: user.email, summary: "Password changed" });
  return { ok: true };
}
