import { localizedValue } from "@/features/content/localized";
import { routing, type Locale } from "@/i18n/routing";
import { db } from "@/lib/db";

export const revalidate = 60;

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get("locale");
  if (!locale || !routing.locales.includes(locale as Locale)) {
    return Response.json({ error: "Invalid locale" }, { status: 400 });
  }

  const currentLocale = locale as Locale;
  const now = new Date();
  const visibility = { status: "PUBLISHED" as const, publishedAt: { lte: now } };
  const select = {
    id: true,
    title: true,
    summary: true,
    startsAt: true,
    endsAt: true,
    locationName: true,
    mode: true,
    registrationOpen: true,
  };
  const [upcoming, past] = await Promise.all([
    db.event.findMany({
      where: { ...visibility, startsAt: { gte: now } },
      select,
      orderBy: { startsAt: "asc" },
      take: 12,
    }),
    db.event.findMany({
      where: { ...visibility, startsAt: { lt: now } },
      select,
      orderBy: { startsAt: "desc" },
      take: 12,
    }),
  ]);

  const formatEvent = (event: (typeof upcoming)[number]) => ({
    id: event.id,
    title: localizedValue(event.title, currentLocale) || localizedValue(event.title, "fr"),
    summary: localizedValue(event.summary, currentLocale) || localizedValue(event.summary, "fr"),
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt?.toISOString() ?? null,
    locationName: event.locationName,
    mode: event.mode,
    registrationOpen: event.registrationOpen,
  });

  return Response.json({
    upcoming: upcoming.map(formatEvent),
    past: past.map(formatEvent),
  });
}
