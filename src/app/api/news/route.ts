import { localizedValue } from "@/features/content/localized";
import { routing, type Locale } from "@/i18n/routing";
import { db } from "@/lib/db";
import { env } from "@/env";

export const revalidate = 60;

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get("locale");
  if (!locale || !routing.locales.includes(locale as Locale)) {
    return Response.json({ error: "Invalid locale" }, { status: 400 });
  }

  const now = new Date();
  const requestedLimit = Number(new URL(request.url).searchParams.get("limit") ?? 3);
  const take = Number.isInteger(requestedLimit) && requestedLimit >= 1 && requestedLimit <= 30 ? requestedLimit : 3;
  const posts = await db.post.findMany({
    where: { status: "PUBLISHED", publishedAt: { lte: now } },
    select: { id: true, slug: true, title: true, excerpt: true, coverImage: true, publishedAt: true },
    orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
    take,
  });
  const cloudName = env.CLOUDINARY_CLOUD_NAME;

  return Response.json(posts.map((post) => ({
    id: post.id,
    slug: post.slug,
    title: localizedValue(post.title, locale) || localizedValue(post.title, "fr"),
    excerpt: localizedValue(post.excerpt, locale) || localizedValue(post.excerpt, "fr"),
    publishedAt: post.publishedAt?.toISOString() ?? null,
    coverImageUrl: post.coverImage && cloudName
      ? `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/image/upload/${post.coverImage.split("/").map(encodeURIComponent).join("/")}`
      : null,
  })));
}
