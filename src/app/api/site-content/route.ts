import { localizedValue } from "@/features/content/localized";
import { routing, type Locale } from "@/i18n/routing";
import { db } from "@/lib/db";
import { env } from "@/env";

export const revalidate = 60;

function cloudinaryUrl(publicId: string | null) {
  if (!publicId || !env.CLOUDINARY_CLOUD_NAME) return null;
  const path = publicId.split("/").map(encodeURIComponent).join("/");
  return `https://res.cloudinary.com/${encodeURIComponent(env.CLOUDINARY_CLOUD_NAME)}/image/upload/${path}`;
}

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get("locale");
  if (!locale || !routing.locales.includes(locale as Locale)) {
    return Response.json({ error: "Invalid locale" }, { status: 400 });
  }

  const [photos, board, sponsors, milestones] = await Promise.all([
    db.media.findMany({
      where: { kind: "IMAGE", folder: "ieee-isitcom/gallery" },
      select: { id: true, publicId: true, url: true, originalName: true, alt: true },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    db.board.findFirst({
      where: { isCurrent: true },
      select: { label: true, members: { where: { isPublished: true }, select: { id: true, fullName: true, position: true, photo: true, bio: true }, orderBy: { order: "asc" } } },
    }),
    db.sponsor.findMany({
      where: { isActive: true },
      select: { id: true, name: true, logo: true, websiteUrl: true, description: true, order: true },
      orderBy: { order: "asc" },
      take: 12,
    }),
    db.milestone.findMany({
      where: { isPublished: true },
      select: { id: true, happenedAt: true, title: true, description: true },
      orderBy: [{ happenedAt: "desc" }, { order: "asc" }],
      take: 24,
    }),
  ]);
  const currentLocale = locale as Locale;

  return Response.json({
    photos: photos.map((photo) => ({
      id: photo.id,
      url: photo.url || cloudinaryUrl(photo.publicId),
      alt: localizedValue(photo.alt, currentLocale) || photo.originalName || "",
    })),
    team: board ? {
      label: board.label,
      members: board.members.map((member) => ({
        id: member.id,
        name: member.fullName,
        position: localizedValue(member.position, currentLocale) || localizedValue(member.position, "fr"),
        bio: localizedValue(member.bio, currentLocale) || localizedValue(member.bio, "fr"),
        photoUrl: cloudinaryUrl(member.photo),
      })),
    } : null,
    sponsors: sponsors.map((sponsor) => ({
      id: sponsor.id,
      name: sponsor.name,
      logoUrl: cloudinaryUrl(sponsor.logo),
      websiteUrl: sponsor.websiteUrl,
      description: localizedValue(sponsor.description, currentLocale) || localizedValue(sponsor.description, "fr"),
    })),
    milestones: milestones.map((milestone) => ({
      id: milestone.id,
      happenedAt: milestone.happenedAt.toISOString().slice(0, 10),
      title: localizedValue(milestone.title, currentLocale) || localizedValue(milestone.title, "fr"),
      description: localizedValue(milestone.description, currentLocale) || localizedValue(milestone.description, "fr"),
    })),
  }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
}
