// NextAuth setup plus helpers that read and guard the current admin session.
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getServerSession, type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { env } from "@/env";
import { audit } from "@/lib/audit";
import { can, type Action } from "@/features/auth/permissions";
import { dummyVerify, verifyPassword } from "@/features/auth/password";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, getHeader, hashIp } from "@/lib/request";
import { loginSchema } from "@/features/auth/validators";

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

export const authOptions: NextAuthOptions = {
  secret: env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 30 }, // 30-minute session lifetime
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      name: "Email & mot de passe",
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(raw, req) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const headers = (req?.headers ?? {}) as Record<string, string | string[] | undefined>;
        const ip = getClientIp(headers);
        const userAgent = getHeader(headers, "user-agent");

        // per-IP throttle, before touching the account
        const rl = await rateLimit(`login:ip:${hashIp(ip)}`, 20, 15 * 60);
        if (!rl.ok) throw new Error("TOO_MANY_ATTEMPTS");

        const user = await db.user.findUnique({ where: { email } });

        if (!user || !user.isActive) {
          await dummyVerify(password);
          await audit({ action: "LOGIN_FAILED", userEmail: email, summary: "Unknown or inactive account", ip, userAgent });
          return null;
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          await audit({ action: "LOGIN_FAILED", userId: user.id, userEmail: user.email, summary: "Attempt while locked", ip, userAgent });
          throw new Error("LOCKED");
        }

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) {
          const { failedLogins } = await db.user.update({
            where: { id: user.id },
            data: { failedLogins: { increment: 1 } },
            select: { failedLogins: true },
          });
          const lock = failedLogins >= MAX_FAILED_LOGINS;
          if (lock) {
            await db.user.update({
              where: { id: user.id },
              data: { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) },
            });
          }
          await audit({
            action: "LOGIN_FAILED",
            userId: user.id,
            userEmail: user.email,
            summary: lock ? `Wrong password — account locked ${LOCK_MINUTES} min` : "Wrong password",
            ip,
            userAgent,
          });
          return null;
        }

        await db.user.update({
          where: { id: user.id },
          data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
        });
        await audit({ action: "LOGIN", userId: user.id, userEmail: user.email, ip, userAgent });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.mustChangePassword = user.mustChangePassword;
        return token;
      }
      if (!token.id) return token;

      // Re-check the account on every session read (PK lookup): deactivation / role change is instant.
      const fresh = await db.user.findUnique({
        where: { id: token.id },
        select: { isActive: true, role: true, mustChangePassword: true, name: true, email: true },
      });
      if (!fresh || !fresh.isActive) return {}; // kills the session
      token.role = fresh.role;
      token.mustChangePassword = fresh.mustChangePassword;
      token.name = fresh.name;
      token.email = fresh.email;
      return token;
    },
    async session({ session, token }) {
      if (!token.id || !token.role) return { ...session, user: undefined };
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id,
          role: token.role,
          mustChangePassword: !!token.mustChangePassword,
        },
      };
    },
  },
  events: {
    async signOut({ token }) {
      if (token?.id) await audit({ action: "LOGOUT", userId: token.id, userEmail: token.email ?? null });
    },
  },
};

/** Cached per request, so layout + page + action share one lookup. */
export const getSession = cache(() => getServerSession(authOptions));

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user?.id ? session.user : null;
}

/** For pages/layouts: redirects to the login page when signed out. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
}

export class ForbiddenError extends Error {
  constructor(public code: "UNAUTHENTICATED" | "FORBIDDEN") {
    super(code);
    this.name = "ForbiddenError";
  }
}

/** For server actions / route handlers: throws instead of redirecting. Call it FIRST in every mutation. */
export async function requireAction(action: Action) {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError("UNAUTHENTICATED");
  if (user.mustChangePassword) throw new ForbiddenError("FORBIDDEN");
  if (!can(user.role, action)) throw new ForbiddenError("FORBIDDEN");
  return user;
}
