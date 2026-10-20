(() => {
  const requested = new URLSearchParams(location.search).get("locale");
  const locale = requested === "en" || requested === "fr" ? requested : location.pathname.startsWith("/en") ? "en" : "fr";
  const $ = (id) => document.getElementById(id);
  const put = (id, text) => { $(id).textContent = text; };
  const choose = (fr, en) => locale === "fr" ? fr : en;

  const setLocaleLinks = () => {
    ["fr", "en"].forEach((code) => {
      const link = $(`locale-${code}`);
      link.href = `/?locale=${code}`;
      if (code === locale) link.setAttribute("aria-current", "page");
    });
    $("nav-events").href = `/events.html?locale=${locale}`;
  };

  fetch(`/api/messages?locale=${locale}`)
    .then((response) => {
      if (!response.ok) throw new Error(`Translations request failed with status ${response.status}`);
      return response.json();
    })
    .then((messages) => {
      const h = messages.home;
      document.documentElement.lang = locale;
      document.title = messages.meta.title;
      document.querySelector('meta[name="description"]').content = messages.meta.description;
      setLocaleLinks();
      [
        ["brand-subline", h.brandSubline], ["nav-about", messages.nav.about], ["nav-events", messages.nav.events],
        ["nav-activities", h.navActivities], ["admin-link", h.admin], ["home-eyebrow", h.eyebrow],
        ["hero-title", h.heroTitle], ["hero-highlight", h.heroHighlight], ["hero-description", h.heroDescription],
        ["join-button", messages.nav.join], ["discover-button", h.discover], ["network-label", h.networkLabel],
        ["location", h.location], ["orbit-one", `${h.orbitOneLabel} · ${h.orbitOneValue}`],
        ["orbit-two", `${h.orbitTwoLabel} · ${h.orbitTwoValue}`], ["about-eyebrow", h.aboutEyebrow],
        ["about-title", h.aboutTitle], ["about-description", h.aboutDescription], ["about-link", h.aboutLink],
        ["focus-eyebrow", h.focusEyebrow], ["focus-title", h.focusTitle], ["focus-description", h.focusDescription],
        ["activities-eyebrow", h.activitiesEyebrow], ["activities-title", h.activitiesTitle],
        ["activities-intro", h.activitiesIntro], ["join-eyebrow", h.joinEyebrow], ["join-title", h.joinTitle],
        ["join-description", h.joinDescription], ["join-cta", h.joinCta], ["footer-location", h.location],
        ["footer-line", h.footerLine],
      ].forEach(([id, text]) => put(id, text));

      const focus = [
        ["technology", h.focus.technologyTitle, h.focus.technologyDescription],
        ["innovation", h.focus.innovationTitle, h.focus.innovationDescription],
        ["community", h.focus.communityTitle, h.focus.communityDescription],
      ];
      $("focus-grid").replaceChildren(...focus.map(([icon, title, description], i) => {
        const card = document.createElement("article");
        card.className = "focus-card";
        const number = document.createElement("span");
        number.className = "card-number";
        number.textContent = `0${i + 1}`;
        const heading = document.createElement("h3");
        heading.textContent = title;
        const body = document.createElement("p");
        body.textContent = description;
        card.append(number, heading, body);
        return card;
      }));

      const activity = [
        [h.activities.workshopsTitle, h.activities.workshopsDescription],
        [h.activities.projectsTitle, h.activities.projectsDescription],
        [h.activities.networkTitle, h.activities.networkDescription],
      ];
      $("activities-list").replaceChildren(...activity.map(([title, description]) => {
        const row = document.createElement("article");
        row.className = "activity-row";
        const heading = document.createElement("h3");
        heading.textContent = title;
        const body = document.createElement("p");
        body.textContent = description;
        row.append(heading, body);
        return row;
      }));
    })
    .catch((error) => {
      console.error("Unable to load page translations.", error);
      setLocaleLinks();
      const notice = $("site-error");
      notice.textContent = choose("Le contenu de la page n’a pas pu être chargé. Veuillez réessayer plus tard.", "Page content could not be loaded. Please try again later.");
      notice.hidden = false;
    });
})();
