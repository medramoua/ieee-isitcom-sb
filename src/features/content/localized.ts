// Read a localized JSON field and return an empty string when untranslated.
export function localizedValue(value: unknown, locale: string): string {
  if (value && typeof value === "object" && locale in value) {
    const localized = (value as Record<string, unknown>)[locale];
    return typeof localized === "string" ? localized : "";
  }
  return "";
}
