(() => {
  const requested = new URLSearchParams(location.search).get("locale");
  const locale = requested === "en" || requested === "fr" ? requested : location.pathname.startsWith("/en") ? "en" : "fr";
  const $ = (id) => document.getElementById(id);
  const put = (id, text) => { $(id).textContent = text || ""; };
  let revealObserver;

  function setLocaleLinks() {
    ["fr", "en"].forEach((code) => {
      const link = $(`locale-${code}`);
      link.href = `/?locale=${code}`;
      if (code === locale) link.setAttribute("aria-current", "page");
    });
    $("nav-explore").href = "#explore";
    $("nav-gallery").href = "#gallery";
    $("nav-team").href = "#team";
  }

  function enableSectionTabs() {
    const links = [...document.querySelectorAll(".main-tabs a")];
    const sections = links.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
    if (!("IntersectionObserver" in window) || !sections.length) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
      if (!visible) return;
      links.forEach((link) => {
        if (link.getAttribute("href") === `#${visible.target.id}`) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }, { rootMargin: "-25% 0px -55% 0px", threshold: [0, 0.15, 0.4] });
    sections.forEach((section) => observer.observe(section));
  }

  function observeMotionElements(root = document) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    if (!revealObserver) {
      document.body.classList.add("motion-ready");
      revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    }
    const selectors = [
      ".site-section > .section-intro", ".site-section > .activities-head", ".about-section > div",
      ".join-section > div", ".join-section > .button", ".site-footer > p",
      ".explore-card", ".gallery-item", ".activity-row", ".team-card", ".news-card", ".sponsor-card", ".resource-card",
    ].join(",");
    root.querySelectorAll(selectors).forEach((element, index) => {
      if (element.classList.contains("motion-reveal")) return;
      element.classList.add("motion-reveal");
      element.style.setProperty("--motion-delay", `${(index % 4) * 75}ms`);
      revealObserver.observe(element);
    });
  }

  function enablePointerEffects() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        !window.matchMedia("(pointer: fine)").matches) return;
    const hero = document.querySelector(".home-hero");
    hero.addEventListener("pointermove", (event) => {
      const bounds = hero.getBoundingClientRect();
      hero.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
      hero.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
    });
    hero.addEventListener("pointerleave", () => {
      hero.style.removeProperty("--pointer-x");
      hero.style.removeProperty("--pointer-y");
    });
    $("explore-grid").addEventListener("pointermove", (event) => {
      const card = event.target.closest(".explore-card");
      if (!card) return;
      const bounds = card.getBoundingClientRect();
      card.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
      card.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
    });
  }

  function renderPhotoCarousel(photos, home) {
    const carousel = $("gallery-carousel");
    const stage = $("gallery-stage");
    const ring = $("gallery-ring");
    const countLabel = $("gallery-count");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const total = photos.length;
    if (!total) {
      carousel.hidden = true;
      $("gallery-empty").hidden = false;
      return;
    }

    carousel.hidden = false;
    carousel.dataset.count = String(total);
    $("gallery-empty").hidden = true;
    stage.setAttribute("aria-label", home.galleryCarouselLabel || home.galleryEyebrow);

    const cards = photos.map((photo, index) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "carousel-card";
      card.style.setProperty("--carousel-index", index);
      const photoLabel = `${home.galleryPhoto || (locale === "fr" ? "Photo" : "Photo")} ${index + 1}`;
      card.setAttribute("aria-label", photoLabel);
      const image = makeImage(photo.url, photoLabel, "");
      if (image) {
        image.draggable = false;
        image.addEventListener("error", () => card.classList.add("image-unavailable"), { once: true });
        card.append(image);
      }
      const fallback = document.createElement("span");
      fallback.className = "carousel-image-fallback";
      fallback.textContent = photoLabel;
      card.append(fallback);
      card.addEventListener("click", () => {
        if (suppressClick) return;
        rotateTo(index);
      });
      ring.append(card);
      return card;
    });

    const state = { angle: 0, active: 0, cardWidth: 0, radius: 0, step: 360 / total, dragging: false, pointerId: null, startX: 0, startAngle: 0, paused: false, inView: true, targetAngle: null, holdUntil: 0, frame: 0, lastFrame: 0 };
    let suppressClick = false;

    function updateActive() {
      const nearest = Math.round(-state.angle / state.step);
      state.active = ((nearest % total) + total) % total;
      countLabel.textContent = `${String(state.active + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
      cards.forEach((card, index) => {
        if (index === state.active) card.setAttribute("aria-current", "true");
        else card.removeAttribute("aria-current");
      });
    }

    function layoutCards() {
      const stageWidth = stage.clientWidth;
      if (!stageWidth) return;
      state.cardWidth = Math.min(220, Math.max(150, stageWidth * (stageWidth < 540 ? 0.62 : 0.23)));
      const pitch = state.cardWidth + 25;
      const circumferenceCount = Math.max(total, 3);
      state.radius = Math.max(
        pitch / (2 * Math.sin(Math.PI / circumferenceCount)),
        state.cardWidth * 0.6
      );
      stage.style.setProperty("--carousel-card-width", `${state.cardWidth}px`);
      applyRotation(false);
    }

    function applyRotation() {
      ring.classList.toggle("is-dragging", state.dragging);
      ring.style.transform = `rotateX(-5deg) rotateY(${state.angle}deg)`;
      cards.forEach((card, index) => {
        const baseAngle = index * state.step;
        const relativeAngle = (baseAngle + state.angle) * Math.PI / 180;
        const depth = 0.55 * (1 - Math.cos(relativeAngle)) / 2;
        card.style.transform = `translate(-50%, -50%) rotateY(${baseAngle}deg) translateZ(${state.radius}px)`;
        card.style.setProperty("--carousel-depth", depth.toFixed(3));
      });
      updateActive();
    }

    function rotateTo(index) {
      const normalized = ((index % total) + total) % total;
      let targetAngle = -normalized * state.step;
      targetAngle += Math.round((state.angle - targetAngle) / 360) * 360;
      if (reducedMotion.matches) {
        state.angle = targetAngle;
        state.targetAngle = null;
        applyRotation();
        return;
      }
      state.targetAngle = targetAngle;
      state.holdUntil = performance.now() + 2800;
      startAutoplay();
    }

    function startAutoplay() {
      if (state.frame || total < 2 || reducedMotion.matches || !state.inView || document.hidden) return;
      state.lastFrame = 0;
      state.frame = window.requestAnimationFrame(animate);
    }

    function animate(now) {
      state.frame = 0;
      if (reducedMotion.matches || !state.inView || document.hidden || total < 2) return;
      const delta = state.lastFrame ? Math.min((now - state.lastFrame) / 1000, 0.05) : 0;
      state.lastFrame = now;

      if (!state.dragging && state.targetAngle !== null) {
        state.angle += (state.targetAngle - state.angle) * (1 - Math.exp(-delta * 7));
        if (Math.abs(state.targetAngle - state.angle) < 0.04) {
          state.angle = state.targetAngle;
          state.targetAngle = null;
        }
      } else if (!state.dragging && !state.paused && now >= state.holdUntil) {
        state.angle -= 14 * delta;
      }

      applyRotation();
      state.frame = window.requestAnimationFrame(animate);
    }

    stage.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        rotateTo(state.active - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        rotateTo(state.active + 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        rotateTo(0);
      } else if (event.key === "End") {
        event.preventDefault();
        rotateTo(total - 1);
      }
    });
    stage.addEventListener("pointerenter", () => { state.paused = true; });
    stage.addEventListener("pointerleave", () => { state.paused = false; });
    carousel.addEventListener("focusin", () => { state.paused = true; });
    carousel.addEventListener("focusout", (event) => {
      if (!carousel.contains(event.relatedTarget)) state.paused = false;
    });
    stage.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      state.dragging = true;
      state.targetAngle = null;
      state.pointerId = event.pointerId;
      state.startX = event.clientX;
      state.startAngle = state.angle;
      stage.setPointerCapture(event.pointerId);
      applyRotation();
    });
    stage.addEventListener("pointermove", (event) => {
      if (!state.dragging || event.pointerId !== state.pointerId) return;
      const delta = event.clientX - state.startX;
      if (Math.abs(delta) > 4) {
        suppressClick = true;
        event.preventDefault();
      }
      state.angle = state.startAngle + delta * 0.34;
      applyRotation();
    });
    const endDrag = (event) => {
      if (!state.dragging || event.pointerId !== state.pointerId) return;
      state.dragging = false;
      state.pointerId = null;
      if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
      state.targetAngle = Math.round(-state.angle / state.step) * -state.step;
      state.holdUntil = performance.now() + 2800;
      if (reducedMotion.matches) {
        state.angle = state.targetAngle;
        state.targetAngle = null;
        applyRotation();
      }
      startAutoplay();
      if (suppressClick) window.setTimeout(() => { suppressClick = false; }, 0);
    };
    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);
    reducedMotion.addEventListener("change", () => {
      if (reducedMotion.matches && state.frame) {
        window.cancelAnimationFrame(state.frame);
        state.frame = 0;
      } else {
        startAutoplay();
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && state.frame) {
        window.cancelAnimationFrame(state.frame);
        state.frame = 0;
      } else {
        startAutoplay();
      }
    });

    if ("IntersectionObserver" in window) {
      const visibilityObserver = new IntersectionObserver(([entry]) => {
        state.inView = entry.isIntersecting;
        if (state.inView) startAutoplay();
        else if (state.frame) {
          window.cancelAnimationFrame(state.frame);
          state.frame = 0;
        }
      });
      visibilityObserver.observe(carousel);
    }
    if ("ResizeObserver" in window) new ResizeObserver(layoutCards).observe(stage);
    else window.addEventListener("resize", layoutCards);
    layoutCards();
    applyRotation();
    startAutoplay();
  }

  function showError(id, message) {
    const notice = $(id);
    notice.textContent = message;
    notice.hidden = false;
  }

  function makeImage(url, alt, className) {
    if (!url) return null;
    const image = document.createElement("img");
    image.src = url;
    image.alt = alt || "";
    image.loading = "lazy";
    image.className = className;
    return image;
  }

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
        ["brand-subline", h.brandSubline], ["nav-explore", h.navExplore], ["nav-gallery", h.navGallery || messages.nav.gallery],
        ["nav-team", messages.nav.team], ["home-eyebrow", h.eyebrow],
        ["hero-title", h.heroTitle], ["hero-highlight", h.heroHighlight], ["hero-description", h.heroDescription],
        ["join-button", messages.nav.join], ["discover-button", h.discover], ["network-label", h.networkLabel],
        ["location", h.location], ["orbit-one", `${h.orbitOneLabel} · ${h.orbitOneValue}`],
        ["orbit-two", `${h.orbitTwoLabel} · ${h.orbitTwoValue}`],
        ["explore-eyebrow", h.exploreEyebrow], ["explore-title", h.exploreTitle],
        ["explore-description", h.exploreDescription], ["about-eyebrow", h.aboutEyebrow],
        ["about-title", h.aboutTitle], ["about-description", h.aboutDescription], ["about-link", h.aboutLink],
        ["gallery-eyebrow", h.galleryEyebrow], ["gallery-title", h.galleryTitle],
        ["gallery-intro", h.galleryIntro], ["gallery-empty", h.galleryEmpty],
        ["activities-eyebrow", h.activitiesEyebrow], ["activities-title", h.activitiesTitle],
        ["activities-intro", h.activitiesIntro], ["team-eyebrow", h.teamEyebrow],
        ["team-title", h.teamTitle], ["team-intro", h.teamIntro], ["team-empty", h.teamEmpty],
        ["awards-eyebrow", h.awardsEyebrow], ["awards-title", h.awardsTitle],
        ["awards-description", h.awardsDescription], ["news-eyebrow", h.newsEyebrow],
        ["news-title", h.newsTitle], ["news-intro", h.newsIntro], ["news-more", h.newsMore],
        ["join-eyebrow", h.joinEyebrow], ["join-title", h.joinTitle],
        ["join-description", h.joinDescription], ["join-cta", h.joinCta],
        ["sponsors-eyebrow", h.sponsorsEyebrow], ["sponsors-title", h.sponsorsTitle],
        ["sponsors-intro", h.sponsorsIntro], ["sponsors-empty", h.sponsorsEmpty],
        ["footer-location", h.location], ["footer-line", h.footerLine],
      ].forEach(([id, text]) => put(id, text));
      document.querySelector(".site-header nav").setAttribute("aria-label", h.navigation);
      enableSectionTabs();
      enablePointerEffects();

      const cards = h.exploreCards;
      const links = ["/#about", "/news.html", "/events.html", "/#join", "/#activities", "/resources.html", "/#awards"];
      $("explore-grid").replaceChildren(...cards.map((card, i) => {
        const link = document.createElement("a");
        link.className = "explore-card";
        const destination = new URL(links[i], location.origin);
        destination.searchParams.set("locale", locale);
        link.href = `${destination.pathname}${destination.search}${destination.hash}`;
        const number = document.createElement("span");
        number.className = "card-number";
        number.textContent = `0${i + 1}`;
        const title = document.createElement("h3");
        title.textContent = card.title;
        const description = document.createElement("p");
        description.textContent = card.description;
        const arrow = document.createElement("span");
        arrow.className = "card-arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "↗";
        link.append(number, title, description, arrow);
        return link;
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
      observeMotionElements();
      loadNews(h);
      loadSiteContent(h);
    })
    .catch((error) => {
      console.error("Unable to load page translations.", error);
      setLocaleLinks();
      showError("site-error", locale === "fr"
        ? "Le contenu de la page n’a pas pu être chargé. Veuillez réessayer plus tard."
        : "Page content could not be loaded. Please try again later.");
    });

  async function loadNews(home) {
    try {
      const response = await fetch(`/api/news?locale=${encodeURIComponent(locale)}`);
      if (!response.ok) throw new Error(`News request failed with status ${response.status}`);
      const posts = await response.json();
      if (!Array.isArray(posts)) throw new Error("News API returned an invalid response");
      const cards = posts.map((post) => {
        const card = document.createElement("article");
        card.className = "news-card";
        const image = makeImage(post.coverImageUrl, post.title, "news-image");
        if (image) card.append(image);
        const body = document.createElement("div");
        body.className = "news-card-body";
        if (post.publishedAt) {
          const date = document.createElement("time");
          date.className = "news-date";
          date.dateTime = post.publishedAt;
          date.textContent = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
            dateStyle: "medium", timeZone: "Africa/Tunis",
          }).format(new Date(post.publishedAt));
          body.append(date);
        }
        const title = document.createElement("h3");
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
      if (!posts.length) {
        const empty = document.createElement("p");
        empty.className = "empty-note";
        empty.textContent = home.newsEmpty;
        $("news-list").replaceChildren(empty);
      }
      observeMotionElements($("news"));
    } catch (error) {
      console.error("Unable to load published news.", error);
      showError("news-error", home.newsError);
    }
  }

  async function loadSiteContent(home) {
    try {
      const response = await fetch(`/api/site-content?locale=${encodeURIComponent(locale)}`);
      if (!response.ok) throw new Error(`Site content request failed with status ${response.status}`);
      const content = await response.json();
      const photos = Array.isArray(content.photos) ? content.photos : [];
      renderPhotoCarousel(photos, home);

      const members = content.team?.members || [];
      $("team-grid").replaceChildren(...members.map((member) => {
        const card = document.createElement("article");
        card.className = "team-card";
        const image = makeImage(member.photoUrl, member.name, "team-photo");
        if (image) card.append(image);
        const name = document.createElement("h3");
        name.textContent = member.name;
        const position = document.createElement("p");
        position.className = "team-position";
        position.textContent = member.position;
        card.append(name, position);
        if (member.bio) {
          const bio = document.createElement("p");
          bio.className = "team-bio";
          bio.textContent = member.bio;
          card.append(bio);
        }
        return card;
      }));
      $("team-empty").hidden = members.length > 0;

      const milestones = Array.isArray(content.milestones) ? content.milestones : [];
      $("milestones-empty").textContent = home.milestonesEmpty || (locale === "fr"
        ? "Les étapes importantes de la branche seront bientôt présentées ici."
        : "Branch milestones will appear here soon.");
      $("milestone-list").replaceChildren(...milestones.map((milestone) => {
        const item = document.createElement("article");
        item.className = "milestone-card";
        const date = document.createElement("time");
        date.dateTime = milestone.happenedAt;
        date.textContent = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
          dateStyle: "long", timeZone: "UTC",
        }).format(new Date(`${milestone.happenedAt}T12:00:00Z`));
        const title = document.createElement("h3");
        title.textContent = milestone.title;
        item.append(date, title);
        if (milestone.description) {
          const description = document.createElement("p");
          description.textContent = milestone.description;
          item.append(description);
        }
        return item;
      }));
      $("milestones-empty").hidden = milestones.length > 0;

      const sponsors = Array.isArray(content.sponsors) ? content.sponsors : [];
      $("sponsors-grid").replaceChildren(...sponsors.map((sponsor) => {
        const card = sponsor.websiteUrl ? document.createElement("a") : document.createElement("article");
        card.className = "sponsor-card";
        if (sponsor.websiteUrl) {
          card.href = sponsor.websiteUrl;
          card.target = "_blank";
          card.rel = "noreferrer";
        }
        const image = makeImage(sponsor.logoUrl, sponsor.name, "sponsor-logo");
        if (image) card.append(image);
        const name = document.createElement("span");
        name.textContent = sponsor.name;
        card.append(name);
        return card;
      }));
      $("sponsors-empty").hidden = sponsors.length > 0;
      observeMotionElements($("gallery"));
      observeMotionElements($("team"));
      observeMotionElements($("sponsors"));
    } catch (error) {
      console.error("Unable to load homepage gallery, team, and sponsors.", error);
      const message = locale === "fr"
        ? "Les photos et informations du site n’ont pas pu être chargées."
        : "Photos and site information could not be loaded.";
      ["gallery-error", "team-error", "sponsors-error"].forEach((id) => showError(id, message));
      $("gallery-empty").textContent = home.galleryEmpty;
      $("team-empty").textContent = home.teamEmpty;
      $("sponsors-empty").textContent = home.sponsorsEmpty;
    }
  }
})();
