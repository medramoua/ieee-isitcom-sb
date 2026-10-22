import { Role, Prisma } from "@prisma/client";
import { createAdminSchema } from "@/features/auth/validators";
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

  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return Response.json({ error: "Requête non autorisée." }, { status: 403 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return Response.json({ error: "Données invalides." }, { status: 400 });
  }
  const parsed = createAdminSchema.safeParse(input);
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
