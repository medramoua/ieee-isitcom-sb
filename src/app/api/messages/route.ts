import { routing, type Locale } from "@/i18n/routing";
import en from "@/i18n/messages/en.json";
import fr from "@/i18n/messages/fr.json";

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get("locale");
  if (!locale || !routing.locales.includes(locale as Locale)) {
    return Response.json({ error: "Invalid locale" }, { status: 400 });
  }
  return Response.json(locale === "fr" ? fr : en, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
  });
}
