(() => {
  const locale = new URLSearchParams(location.search).get("locale") === "en" ? "en" : "fr";
  const $ = (id) => document.getElementById(id);
  const put = (id, value) => { $(id).textContent = value || ""; };
  ["fr", "en"].forEach((code) => {
    const link = $(`locale-${code}`);
    link.href = `/resources.html?locale=${code}`;
    if (code === locale) link.setAttribute("aria-current", "page");
  });
  document.querySelector(".site-brand").href = `/?locale=${locale}`;
  $("back-home").href = `/?locale=${locale}#explore`;
  fetch(`/api/messages?locale=${locale}`).then((response) => {
    if (!response.ok) throw new Error(`Translation request failed with status ${response.status}`);
    return response.json();
  }).then((messages) => {
    const home = messages.home;
    const resources = home.resources;
    document.documentElement.lang = locale;
    document.title = `${resources.title} | IEEE ISITCom`;
    window.updatePageMetadata?.(`${resources.title} | IEEE ISITCom`, resources.intro, locale);
    [
      ["brand-subline", home.brandSubline], ["back-home", messages.nav.home],
      ["resources-eyebrow", resources.eyebrow], ["resources-title", resources.title],
      ["resources-intro", resources.intro], ["resource-ieee-title", resources.ieeeTitle],
      ["resource-ieee-description", resources.ieeeDescription],
      ["resource-xplore-title", resources.xploreTitle], ["resource-xplore-description", resources.xploreDescription],
      ["resource-membership-title", resources.membershipTitle],
      ["resource-membership-description", resources.membershipDescription],
      ["footer-location", home.location], ["footer-line", home.footerLine],
    ].forEach(([id, value]) => put(id, value));
  }).catch((error) => {
    console.error("Unable to load the resources page.", error);
    document.querySelector("main").insertAdjacentHTML("afterbegin",
      `<p class="site-error" role="alert">${locale === "fr" ? "Les ressources ne peuvent pas être chargées." : "Resources could not be loaded."}</p>`);
  });
})();
