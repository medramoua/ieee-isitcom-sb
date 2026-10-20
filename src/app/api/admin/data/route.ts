import { ContentStatus, type Prisma } from "@prisma/client";
import { localizedValue } from "@/features/content/localized";
import { getCurrentUser } from "@/features/auth/session";
import { can, ROLE_LABEL } from "@/features/auth/permissions";
import { formatTunisDateTime } from "@/features/content/dates";
import { db } from "@/lib/db";
import { env } from "@/env";

const kinds = ["events", "news", "projects"] as const;
type Kind = (typeof kinds)[number];

const kindsInfo: Record<Kind, { label: string; singular: string }> = {
  events: { label: "Événements", singular: "événement" },
  news: { label: "Actualités", singular: "actualité" },
  projects: { label: "Projets", singular: "projet" },
};

const statuses: Record<ContentStatus, string> = {
  DRAFT: "Brouillon",
  IN_REVIEW: "À réviser",
  PUBLISHED: "Publié / programmé",
  ARCHIVED: "Archivé",
};

type ContentRow = { id: string; slug: string; title: Prisma.JsonValue; status: ContentStatus; updatedAt: Date };

function baseValues(kind: Kind, entry: {
  id: string; slug: string; title: Prisma.JsonValue; summary?: Prisma.JsonValue | null;
  excerpt?: Prisma.JsonValue | null; description?: Prisma.JsonValue | null; content?: Prisma.JsonValue;
  coverImage: string | null; status: ContentStatus; publishedAt: Date | null;
}) {
  const summary = entry.summary ?? entry.excerpt ?? null;
  const description = entry.description ?? entry.content ?? null;
  const coverImage = entry.coverImage ?? "";
  const coverImagePath = coverImage.split("/").map(encodeURIComponent).join("/");
  return {
    id: entry.id,
    kind,
    slug: entry.slug,
    title: Object.fromEntries(["fr", "en"].map((locale) => [locale, localizedValue(entry.title, locale)])),
    summary: Object.fromEntries(["fr", "en"].map((locale) => [locale, localizedValue(summary, locale)])),
    description: Object.fromEntries(["fr", "en"].map((locale) => [locale, localizedValue(description, locale)])),
    coverImage,
    coverImageUrl: coverImage && env.CLOUDINARY_CLOUD_NAME
      ? `https://res.cloudinary.com/${encodeURIComponent(env.CLOUDINARY_CLOUD_NAME)}/image/upload/${coverImagePath}`
      : "",
    status: entry.status,
    publishedAt: formatTunisDateTime(entry.publishedAt),
    startsAt: "",
    endsAt: "",
    locationName: "",
    mode: "IN_PERSON",
    stage: "IN_PROGRESS",
    techTags: "",
  };
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Session expirée. Reconnectez-vous." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const view = params.get("view") ?? "dashboard";
  if (view === "session") {
    return Response.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roleLabel: ROLE_LABEL[user.role],
      mustChangePassword: user.mustChangePassword,
      canEdit: can(user.role, "content:edit"),
      canDelete: can(user.role, "content:delete"),
      canManage: can(user.role, "org:manage"),
    });
  }
  if (user.mustChangePassword) {
    return Response.json({ error: "Vous devez changer votre mot de passe avant de continuer." }, { status: 403 });
  }
  if (view === "dashboard") {
    const [events, posts, projects] = await Promise.all([
      db.event.count(),
      db.post.count(),
      db.project.count(),
    ]);
    return Response.json({ name: user.name, events, news: posts, projects });
  }

  const kind = params.get("kind");
  if (!kind || !kinds.includes(kind as Kind)) return Response.json({ error: "Type de contenu invalide." }, { status: 400 });
  const currentKind = kind as Kind;
  const id = params.get("id");

  if (id) {
    if (!can(user.role, "content:edit")) return Response.json({ error: "Accès refusé." }, { status: 403 });
    let values;
    if (currentKind === "events") {
      const entry = await db.event.findUnique({ where: { id } });
      if (!entry) return Response.json({ error: "Événement introuvable." }, { status: 404 });
      values = {
        ...baseValues(currentKind, entry),
        startsAt: formatTunisDateTime(entry.startsAt),
        endsAt: formatTunisDateTime(entry.endsAt),
        locationName: entry.locationName ?? "",
        mode: entry.mode,
      };
    } else if (currentKind === "news") {
      const entry = await db.post.findUnique({ where: { id } });
      if (!entry) return Response.json({ error: "Actualité introuvable." }, { status: 404 });
      values = baseValues(currentKind, entry);
    } else {
      const entry = await db.project.findUnique({ where: { id } });
      if (!entry) return Response.json({ error: "Projet introuvable." }, { status: 404 });
      values = { ...baseValues(currentKind, entry), stage: entry.stage, techTags: entry.techTags.join(", ") };
    }
    return Response.json({ values, canDelete: can(user.role, "content:delete"), role: user.role });
  }

  let rows: ContentRow[];
  if (currentKind === "events") {
    rows = await db.event.findMany({ select: { id: true, slug: true, title: true, status: true, updatedAt: true }, orderBy: { updatedAt: "desc" } });
  } else if (currentKind === "news") {
    rows = await db.post.findMany({ select: { id: true, slug: true, title: true, status: true, updatedAt: true }, orderBy: { updatedAt: "desc" } });
  } else {
    rows = await db.project.findMany({ select: { id: true, slug: true, title: true, status: true, updatedAt: true }, orderBy: { updatedAt: "desc" } });
  }
  return Response.json({
    kind: currentKind,
    ...kindsInfo[currentKind],
    canEdit: can(user.role, "content:edit"),
    rows: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: localizedValue(row.title, "fr") || row.slug,
      status: statuses[row.status],
      updatedAt: new Intl.DateTimeFormat("fr-TN", { dateStyle: "medium", timeZone: "Africa/Tunis" }).format(row.updatedAt),
    })),
  });
}
