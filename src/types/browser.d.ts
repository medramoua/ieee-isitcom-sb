export {};

declare global {
  interface Window {
    updatePageMetadata?: (title: string, description: string, locale: string) => void;
  }
}
