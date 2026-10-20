(() => {
  const locale = new URLSearchParams(location.search).get("locale") === "en" ? "en" : "fr";
  const $ = (id) => document.getElementById(id);
  const put = (id, value) => { $(id).textContent = value || ""; };
  ["fr", "en"].forEach((code) => {
    const link = $(`locale-${code}`);
    link.href = `/news.html?locale=${code}`;
    if (code === locale) link.setAttribute("aria-current", "page");
  });
  document.querySelector(".site-brand").href = `/?locale=${locale}`;
  $("back-home").href = `/?locale=${locale}#explore`;

  Promise.all([
    fetch(`/api/messages?locale=${locale}`).then((response) => {
      if (!response.ok) throw new Error(`Translation request failed with status ${response.status}`);
      return response.json();
    }),
    fetch(`/api/news?locale=${locale}&limit=30`).then((response) => {
      if (!response.ok) throw new Error(`News request failed with status ${response.status}`);
      return response.json();
    }),
  ]).then(([messages, posts]) => {
    const home = messages.home;
    document.documentElement.lang = locale;
    document.title = `${home.newsTitle} | IEEE ISITCom`;
    [
      ["brand-subline", home.brandSubline], ["back-home", messages.nav.home],
      ["news-eyebrow", home.newsEyebrow], ["news-title", home.newsTitle],
      ["news-intro", home.newsIntro], ["news-empty", home.newsEmpty],
      ["footer-location", home.location], ["footer-line", home.footerLine],
    ].forEach(([id, value]) => put(id, value));
    const cards = posts.map((post) => {
      const card = document.createElement("article");
      card.className = "news-card";
      if (post.coverImageUrl) {
        const image = document.createElement("img");
        image.src = post.coverImageUrl;
        image.alt = post.title;
        image.loading = "lazy";
        image.className = "news-image";
        card.append(image);
      }
      const body = document.createElement("div");
      body.className = "news-card-body";
      if (post.publishedAt) {
        const date = document.createElement("time");
        date.dateTime = post.publishedAt;
        date.className = "news-date";
        date.textContent = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
          dateStyle: "medium", timeZone: "Africa/Tunis",
        }).format(new Date(post.publishedAt));
        body.append(date);
      }
      const title = document.createElement("h2");
      title.textContent = post.title;
      body.append(title);
      if (post.excerpt) {
        const excerpt = document.createElement("p");
        excerpt.textContent = post.excerpt;
        body.append(excerpt);
      }
      card.append(body);
      return card;
    });
    $("news-list").replaceChildren(...cards);
    $("news-empty").hidden = posts.length > 0;
  }).catch((error) => {
    console.error("Unable to load the news page.", error);
    $("news-error").textContent = locale === "fr"
      ? "Les actualités ne peuvent pas être chargées pour le moment."
      : "News could not be loaded right now.";
    $("news-error").hidden = false;
  });
})();
