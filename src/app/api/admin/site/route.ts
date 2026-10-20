import { z } from "zod";
import { getCurrentUser, requireAction, ForbiddenError } from "@/features/auth/session";
import { isSameOrigin } from "@/lib/request";
import { db } from "@/lib/db";
import { env } from "@/env";

const saveSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add-member"),
    name: z.string().trim().min(1).max(120),
    positionFr: z.string().trim().min(1).max(120),
    positionEn: z.string().trim().max(120).optional(),
    bioFr: z.string().trim().max(1000).optional(),
    bioEn: z.string().trim().max(1000).optional(),
    photo: z.string().max(255).optional(),
  }),
  z.object({
    action: z.literal("add-sponsor"),
    name: z.string().trim().min(1).max(120),
    websiteUrl: z.string().url().max(500).refine((value) => {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    }, "Le site partenaire doit utiliser une adresse HTTP ou HTTPS.").optional().or(z.literal("")),
    logo: z.string().max(255).optional(),
    descriptionFr: z.string().trim().max(1000).optional(),
    descriptionEn: z.string().trim().max(1000).optional(),
  }),
  z.object({
    action: z.literal("add-milestone"),
    happenedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide."),
    titleFr: z.string().trim().min(1).max(240),
    titleEn: z.string().trim().max(240).optional(),
    descriptionFr: z.string().trim().max(1000).optional(),
    descriptionEn: z.string().trim().max(1000).optional(),
  }),
  z.object({ action: z.literal("remove-member"), id: z.string().min(1) }),
  z.object({ action: z.literal("remove-sponsor"), id: z.string().min(1) }),
  z.object({ action: z.literal("remove-milestone"), id: z.string().min(1) }),
  z.object({ action: z.literal("remove-photo"), id: z.string().min(1) }),
]);

function localized(fr?: string, en?: string) {
  const french = fr?.trim() ?? "";
  const english = en?.trim() ?? "";
  return { fr: french, ...(english ? { en: english } : {}) };
}

function cloudinaryUrl(publicId: string | null) {
  if (!publicId || !env.CLOUDINARY_CLOUD_NAME) return null;
  const path = publicId.split("/").map(encodeURIComponent).join("/");
  return `https://res.cloudinary.com/${encodeURIComponent(env.CLOUDINARY_CLOUD_NAME)}/image/upload/${path}`;
}

async function requireSiteManager() {
  try {
    return await requireAction("org:manage");
  } catch (error) {
    if (error instanceof ForbiddenError) return null;
    throw error;
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Session expirée. Reconnectez-vous." }, { status: 401 });
  if (!user || user.mustChangePassword) return Response.json({ error: "Accès refusé." }, { status: 403 });
  const allowed = await requireSiteManager();
  if (!allowed) return Response.json({ error: "Accès refusé." }, { status: 403 });

  const [photos, board, sponsors, milestones] = await Promise.all([
    db.media.findMany({
      where: { kind: "IMAGE", folder: "ieee-isitcom/gallery" },
      select: { id: true, url: true, originalName: true },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    db.board.findFirst({
      where: { isCurrent: true },
      select: { id: true, label: true, members: { select: { id: true, fullName: true, position: true, photo: true, isPublished: true }, orderBy: { order: "asc" } } },
    }),
    db.sponsor.findMany({
      select: { id: true, name: true, logo: true, websiteUrl: true, isActive: true },
      orderBy: { order: "asc" },
      take: 60,
    }),
    db.milestone.findMany({
      select: { id: true, happenedAt: true, title: true, description: true, isPublished: true },
      orderBy: [{ happenedAt: "desc" }, { order: "asc" }],
      take: 60,
    }),
  ]);
  return Response.json({
    photos,
    board: board ? {
      ...board,
      members: board.members.map((member) => ({ ...member, photoUrl: cloudinaryUrl(member.photo) })),
    } : null,
    sponsors: sponsors.map((sponsor) => ({ ...sponsor, logoUrl: cloudinaryUrl(sponsor.logo) })),
    milestones: milestones.map((milestone) => ({
      ...milestone,
      happenedAt: milestone.happenedAt.toISOString().slice(0, 10),
    })),
  });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Requête non autorisée." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Session expirée. Reconnectez-vous." }, { status: 401 });
  const allowed = await requireSiteManager();
  if (!allowed) return Response.json({ error: "Accès refusé." }, { status: 403 });

  const body: unknown = await request.json();
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
  const data = parsed.data;

  if (data.action === "add-milestone") {
    const happenedAt = new Date(`${data.happenedAt}T12:00:00.000Z`);
    if (Number.isNaN(happenedAt.getTime()) || happenedAt.toISOString().slice(0, 10) !== data.happenedAt) {
      return Response.json({ error: "Date invalide." }, { status: 400 });
    }
    const order = await db.milestone.count();
    await db.milestone.create({
      data: {
        happenedAt,
        title: localized(data.titleFr, data.titleEn),
        description: data.descriptionFr || data.descriptionEn ? localized(data.descriptionFr, data.descriptionEn) : undefined,
        order,
        isPublished: true,
      },
    });
  } else if (data.action === "add-member") {
    let board = await db.board.findFirst({ where: { isCurrent: true }, select: { id: true } });
    if (!board) {
      const startYear = new Date().getFullYear();
      board = await db.board.create({ data: { label: `${startYear}–${startYear + 1}`, startYear, endYear: startYear + 1, isCurrent: true }, select: { id: true } });
    }
    const order = await db.teamMember.count({ where: { boardId: board.id } });
    await db.teamMember.create({
      data: {
        boardId: board.id,
        fullName: data.name,
        position: localized(data.positionFr, data.positionEn),
        bio: data.bioFr || data.bioEn ? localized(data.bioFr, data.bioEn) : undefined,
        photo: data.photo || null,
        order,
        isPublished: true,
      },
    });
  } else if (data.action === "add-sponsor") {
    const order = await db.sponsor.count();
    await db.sponsor.create({
      data: {
        name: data.name,
        websiteUrl: data.websiteUrl || null,
        logo: data.logo || null,
        description: data.descriptionFr || data.descriptionEn ? localized(data.descriptionFr, data.descriptionEn) : undefined,
        order,
        isActive: true,
      },
    });
  } else if (data.action === "remove-member") {
    await db.teamMember.delete({ where: { id: data.id } });
  } else if (data.action === "remove-sponsor") {
    await db.sponsor.delete({ where: { id: data.id } });
  } else if (data.action === "remove-milestone") {
    await db.milestone.delete({ where: { id: data.id } });
  } else {
    await db.media.delete({ where: { id: data.id, folder: "ieee-isitcom/gallery" } });
  }

  return Response.json({ ok: true });
}
