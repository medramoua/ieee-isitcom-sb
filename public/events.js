(() => {
  const translations = {
    en: {
      title: "Events",
      description: "Discover upcoming events and past activities from the IEEE Student Branch at ISITCom.",
      eyebrow: "At ISITCom",
      heading: "Ideas come to life when we get together.",
      heroDescription: "Workshops, talks, and meetups organized by the IEEE Student Branch. Find upcoming dates and moments we've shared.",
      upcomingEyebrow: "Coming up",
      upcomingHeading: "Upcoming events",
      emptyTitle: "No events announced just yet",
      emptyDescription: "New activities are in the works. Check back soon to find out what the branch is planning.",
      pastEyebrow: "Memories we've made",
      pastHeading: "Past events",
      past: "Past",
      inPerson: "In person",
      online: "Online",
      hybrid: "Hybrid",
      registrationClosed: "Registration for this event is closed.",
      loadError: "Events could not be loaded. Please try again later.",
    },
    fr: {
      title: "Événements",
      description: "Découvrez les prochains événements et les activités passées de la branche étudiante IEEE à l’ISITCom.",
      eyebrow: "À l’ISITCom",
      heading: "Des idées prennent vie quand on se retrouve.",
      heroDescription: "Ateliers, conférences et rencontres organisés par la branche étudiante IEEE. Retrouvez ici les prochains rendez-vous et les moments partagés.",
      upcomingEyebrow: "À venir",
      upcomingHeading: "Prochains événements",
      emptyTitle: "Aucun événement annoncé pour le moment",
      emptyDescription: "De nouvelles activités sont en préparation. Revenez bientôt pour découvrir les prochains rendez-vous de la branche.",
      pastEyebrow: "Nos moments partagés",
      pastHeading: "Événements passés",
      past: "Passé",
      inPerson: "Présentiel",
      online: "En ligne",
      hybrid: "Hybride",
      registrationClosed: "Les inscriptions pour cet événement sont fermées.",
      loadError: "Les événements n’ont pas pu être chargés. Veuillez réessayer plus tard.",
    },
  };

  const requestedLocale = new URLSearchParams(window.location.search).get("locale");
  const locale = requestedLocale === "fr" || requestedLocale === "en"
    ? requestedLocale
    : navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
  const language = locale === "fr" ? "fr-FR" : "en-GB";
  const labels = translations[locale];
  document.querySelector(".brand").href = `/?locale=${locale}`;
  const setText = (id, value) => {
    document.getElementById(id).textContent = value;
  };

  document.documentElement.lang = locale;
  document.title = `${labels.title} | IEEE ISITCom`;
  document.querySelector('meta[name="description"]').content = labels.description;
  document.querySelectorAll(".language-switch a").forEach((link) => {
    if (link.getAttribute("href").endsWith(`locale=${locale}`)) {
      link.setAttribute("aria-current", "true");
    }
  });
  setText("eyebrow", labels.eyebrow);
  setText("page-title", labels.heading);
  setText("page-description", labels.heroDescription);
  setText("upcoming-eyebrow", labels.upcomingEyebrow);
  setText("upcoming-heading", labels.upcomingHeading);
  setText("empty-title", labels.emptyTitle);
  setText("empty-description", labels.emptyDescription);
  setText("past-eyebrow", labels.pastEyebrow);
  setText("past-heading", labels.pastHeading);
  document.getElementById("upcoming-count").setAttribute("aria-label", labels.upcomingHeading);

  const appendText = (parent, tag, text, className) => {
    const element = document.createElement(tag);
    element.textContent = text;
    if (className) element.className = className;
    parent.append(element);
    return element;
  };

  const icon = (path) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    const shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
    shape.setAttribute("d", path);
    svg.append(shape);
    return svg;
  };

  const makeEventCard = (event, isPast) => {
    const date = new Date(event.startsAt);
    const dateText = new Intl.DateTimeFormat(language, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Africa/Tunis",
    }).format(date);
    const monthText = new Intl.DateTimeFormat(language, {
      month: "short",
      timeZone: "Africa/Tunis",
    }).format(date);
    const formatTime = (value) => new Intl.DateTimeFormat(language, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Tunis",
    }).format(new Date(value));
    const endTime = event.endsAt ? `–${formatTime(event.endsAt)}` : "";
    const modeLabel = event.mode === "ONLINE" ? labels.online : event.mode === "HYBRID" ? labels.hybrid : labels.inPerson;

    const card = document.createElement("article");
    card.className = `event-card${isPast ? " is-past" : ""}`;
    const dateBadge = document.createElement("div");
    dateBadge.className = "date-badge";
    dateBadge.append(icon("M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z"));
    appendText(dateBadge, "span", monthText);
    card.append(dateBadge);

    const details = document.createElement("div");
    details.className = "event-details";
    const heading = document.createElement("div");
    heading.className = "event-title-row";
    appendText(heading, "h3", event.title);
    if (isPast) appendText(heading, "span", labels.past, "past-badge");
    details.append(heading);
    if (event.summary) appendText(details, "p", event.summary, "event-summary");

    const metadata = document.createElement("div");
    metadata.className = "event-metadata";
    const dateItem = document.createElement("span");
    dateItem.className = "metadata-item";
    dateItem.append(icon("M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z"));
    const time = document.createElement("time");
    time.dateTime = event.startsAt;
    time.textContent = `${dateText}, ${formatTime(event.startsAt)}${endTime}`;
    dateItem.append(time);
    metadata.append(dateItem);

    if (event.locationName) {
      const location = document.createElement("span");
      location.className = "metadata-item";
      location.append(icon("M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"));
      appendText(location, "span", event.locationName);
      metadata.append(location);
    }

    const mode = document.createElement("span");
    mode.className = "metadata-item";
    mode.append(icon(event.mode === "ONLINE"
      ? "M3 5h18v12H3zM8 21h8m-4-4v4"
      : "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10 10v-2a4 4 0 0 0-3-3.87m-1-11.13a4 4 0 0 1 0 7.75"));
    appendText(mode, "span", modeLabel);
    metadata.append(mode);
    details.append(metadata);

    if (!isPast && !event.registrationOpen) {
      appendText(details, "p", labels.registrationClosed, "registration-closed");
    }

    card.append(details);
    return card;
  };

  const showError = (error) => {
    console.error("Unable to load events.", error);
    document.getElementById("events-error").textContent = labels.loadError;
    document.getElementById("events-error").hidden = false;
    document.getElementById("upcoming-count").textContent = "—";
  };

  const loadEvents = async () => {
    try {
      const response = await fetch(`/api/events?locale=${encodeURIComponent(locale)}`);
      if (!response.ok) throw new Error(`Events request failed with status ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.upcoming) || !Array.isArray(data.past)) {
        throw new Error("Events API returned an invalid response");
      }

      document.getElementById("upcoming-count").textContent = String(data.upcoming.length);
      const upcomingCards = document.createDocumentFragment();
      data.upcoming.forEach((event) => upcomingCards.append(makeEventCard(event, false)));
      document.getElementById("upcoming-list").replaceChildren(upcomingCards);
      document.getElementById("upcoming-empty").hidden = data.upcoming.length > 0;

      if (data.past.length) {
        const pastCards = document.createDocumentFragment();
        data.past.forEach((event) => pastCards.append(makeEventCard(event, true)));
        document.getElementById("past-list").replaceChildren(pastCards);
        document.getElementById("past-section").hidden = false;
      }
    } catch (error) {
      showError(error);
    }
  };

  loadEvents();
})();
