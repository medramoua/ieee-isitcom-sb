import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr", // served without prefix; English uses /en
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
