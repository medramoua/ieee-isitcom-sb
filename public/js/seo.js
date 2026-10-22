(() => {
  const setMeta = (selector, content) => {
    const element = document.querySelector(selector);
    if (element) element.content = content;
  };

  window.updatePageMetadata = (title, description, locale) => {
    const ogLocale = locale === "fr" ? "fr_FR" : "en_US";
    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[property="og:locale"]', ogLocale);
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', description);
  };
})();
