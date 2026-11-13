import { Role, Prisma } from "@prisma/client";
import { adminUserIdSchema, adminUserStatusSchema, createAdminSchema } from "@/features/auth/validators";
import { requireAction, ForbiddenError } from "@/features/auth/session";
import { hashPassword } from "@/features/auth/password";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

type AccessResult =
  | { user: Awaited<ReturnType<typeof requireAction>>; response?: never }
  | { user?: never; response: Response };

async function authorize(): Promise<AccessResult> {
  try {
    return { user: await requireAction("users:manage") };
  } catch (error) {
    if (!(error instanceof ForbiddenError)) throw error;
    return {
      response: Response.json(
        { error: error.code === "UNAUTHENTICATED" ? "Session expirée. Reconnectez-vous." : "Accès refusé." },
        { status: error.code === "UNAUTHENTICATED" ? 401 : 403 },
      ),
    };
  }
}

function hasValidOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !!origin && origin === new URL(request.url).origin;
}

async function readJson(request: Request): Promise<{ input: unknown; response?: never } | { input?: never; response: Response }> {
  try {
    return { input: await request.json() };
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return { response: Response.json({ error: "Données invalides." }, { status: 400 }) };
  }
}

export async function GET() {
  const access = await authorize();
  if (access.response) return access.response;

  const users = await db.user.findMany({
    where: { role: Role.ADMIN },
    select: { id: true, name: true, email: true, isActive: true, createdAt: true, lastLoginAt: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return Response.json({ users });
}

export async function POST(request: Request) {
  const access = await authorize();
  if (access.response) return access.response;
  const actor = access.user;

  if (!hasValidOrigin(request)) {
    return Response.json({ error: "Requête non autorisée." }, { status: 403 });
  }

  const body = await readJson(request);
  if (body.response) return body.response;
  const parsed = createAdminSchema.safeParse(body.input);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
  }
  const limit = await rateLimit(`admin:create-user:${actor.id}`, 10, 60 * 60);
  if (!limit.ok) {
    return Response.json({ error: "Trop de comptes créés. Réessayez dans une heure." }, { status: 429 });
  }

  let user: { id: string; name: string; email: string };
  try {
    user = await db.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        role: Role.ADMIN,
        passwordHash: await hashPassword(parsed.data.password),
        mustChangePassword: true,
      },
      select: { id: true, name: true, email: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "Un compte existe déjà avec cette adresse email." }, { status: 409 });
    }
    throw error;
  }

  await audit({
    action: "CREATE",
    userId: actor.id,
    userEmail: actor.email,
    entityType: "User",
    entityId: user.id,
    summary: `Created admin account for ${user.email}`,
  });

  return Response.json(
    {
      ok: true,
      user: { id: user.id, name: user.name, email: user.email, role: Role.ADMIN },
    },
    { status: 201 },
  );
}

export async function PATCH(request: Request) {
  const access = await authorize();
  if (access.response) return access.response;
  const actor = access.user;

  if (!hasValidOrigin(request)) {
    return Response.json({ error: "Requête non autorisée." }, { status: 403 });
  }

  const body = await readJson(request);
  if (body.response) return body.response;
  const parsed = adminUserStatusSchema.safeParse(body.input);
  if (!parsed.success) {
    return Response.json({ error: "Données invalides." }, { status: 400 });
  }
  if (parsed.data.id === actor.id) {
    return Response.json({ error: "Vous ne pouvez pas désactiver votre propre compte." }, { status: 400 });
  }

  const target = await db.user.findFirst({
    where: { id: parsed.data.id, role: Role.ADMIN },
    select: { id: true, email: true },
  });
  if (!target) return Response.json({ error: "Administrateur introuvable." }, { status: 404 });

  const updated = await db.user.updateMany({
    where: { id: target.id, role: Role.ADMIN },
    data: { isActive: parsed.data.isActive },
  });
  if (updated.count !== 1) return Response.json({ error: "Administrateur introuvable." }, { status: 404 });

  await audit({
    action: "UPDATE",
    userId: actor.id,
    userEmail: actor.email,
    entityType: "User",
    entityId: target.id,
    summary: `${parsed.data.isActive ? "Reactivated" : "Deactivated"} admin account for ${target.email}`,
    metadata: { isActive: parsed.data.isActive },
  });

  return Response.json({ ok: true, isActive: parsed.data.isActive });
}

export async function DELETE(request: Request) {
  const access = await authorize();
  if (access.response) return access.response;
  const actor = access.user;

  if (!hasValidOrigin(request)) {
    return Response.json({ error: "Requête non autorisée." }, { status: 403 });
  }

  const parsedId = adminUserIdSchema.safeParse(new URL(request.url).searchParams.get("id"));
  if (!parsedId.success) return Response.json({ error: "Identifiant invalide." }, { status: 400 });
  if (parsedId.data === actor.id) {
    return Response.json({ error: "Vous ne pouvez pas supprimer votre propre compte." }, { status: 400 });
  }

  const target = await db.user.findFirst({
    where: { id: parsedId.data, role: Role.ADMIN },
    select: { id: true, email: true },
  });
  if (!target) return Response.json({ error: "Administrateur introuvable." }, { status: 404 });

  const deleted = await db.user.deleteMany({
    where: { id: target.id, role: Role.ADMIN },
  });
  if (deleted.count !== 1) return Response.json({ error: "Administrateur introuvable." }, { status: 404 });

  await audit({
    action: "DELETE",
    userId: actor.id,
    userEmail: actor.email,
    entityType: "User",
    entityId: target.id,
    summary: `Deleted admin account for ${target.email}`,
  });

  return Response.json({ ok: true });
}
