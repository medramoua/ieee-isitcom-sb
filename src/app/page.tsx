import type { Metadata } from "next";
import Script from "next/script";
import HomePage from "@/components/site/home-page";
import en from "@/i18n/messages/en.json";
import fr from "@/i18n/messages/fr.json";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const isEnglish = params.locale === "en";
  const messages = isEnglish ? en : fr;
  return {
    title: messages.meta.title,
    description: messages.meta.description,
    openGraph: {
      title: messages.meta.title,
      description: messages.meta.description,
      siteName: "IEEE ISITCom Student Branch",
      type: "website",
      locale: isEnglish ? "en_US" : "fr_FR",
    },
    twitter: {
      card: "summary",
      title: messages.meta.title,
      description: messages.meta.description,
    },
  };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ locale?: string }> }) {
  const params = await searchParams;
  const locale = params.locale === "en" ? "en" : "fr";
  const messages = locale === "en" ? en : fr;
  return (
    <>
      <HomePage locale={locale} messages={messages} />
      <Script src="/js/molten-background.js" strategy="afterInteractive" />
      <Script src="/js/glow-cursor.js" strategy="afterInteractive" />
    </>
  );
}
