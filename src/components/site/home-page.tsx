"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, BookOpen, Bot, CalendarDays, ChevronDown, Newspaper, Rocket, Trophy } from "lucide-react";
import HoverRevealCards, { type CardItem } from "@/components/ui/cards";
import { TextReveal } from "@/components/ui/text-reveal";
import PhotoWheelGallery from "@/components/site/photo-wheel-gallery";
import type en from "@/i18n/messages/en.json";

type HomeContent = typeof en.home;
type NavigationMessages = typeof en.nav;
type Locale = "en" | "fr";

interface Messages {
  meta: typeof en.meta;
  nav: NavigationMessages;
  home: HomeContent;
}

interface SiteContent {
  photos: Array<{ id: string; url: string | null; alt: string }>;
  team: { members: Array<{ id: string; name: string; position: string; bio: string; photoUrl: string | null }> } | null;
  sponsors: Array<{ id: string; name: string; logoUrl: string | null; websiteUrl: string | null }>;
  milestones: Array<{ id: string; happenedAt: string; title: string; description: string }>;
}

interface NewsPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string | null;
  coverImageUrl: string | null;
}

const exploreIcons = [Bot, Newspaper, CalendarDays, BadgeCheck, Rocket, BookOpen, Trophy];

function formatDate(date: string | null, locale: Locale) {
  if (!date) return "";
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    dateStyle: "medium",
    timeZone: "Africa/Tunis",
  }).format(new Date(date));
}

export default function HomePage({ locale, messages }: { locale: Locale; messages: Messages }) {
  const { home, nav } = messages;
  const [siteContent, setSiteContent] = useState<SiteContent | null>(null);
  const [news, setNews] = useState<NewsPost[]>([]);
  const [siteError, setSiteError] = useState("");
  const [newsError, setNewsError] = useState("");
  const galleryItems = useMemo(
    () => siteContent?.photos.filter((photo): photo is typeof photo & { url: string } => Boolean(photo.url)) ?? [],
    [siteContent],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = messages.meta.title;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) description.content = messages.meta.description;

    const links = [...document.querySelectorAll<HTMLAnchorElement>(".main-tabs a")];
    const sections = links.flatMap((link) => {
      if (!link.hash || link.hash === "#") return [];
      const section = document.querySelector(link.hash);
      return section ? [section] : [];
    });
    let observer: IntersectionObserver | undefined;
    if ("IntersectionObserver" in window && sections.length) {
      const sectionObserver = new IntersectionObserver((entries) => {
        const active = entries.filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        if (!active) return;
        links.forEach((link) => {
          if (link.hash === `#${active.target.id}`) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      }, { rootMargin: "-25% 0px -55% 0px", threshold: [0, .15, .4] });
      observer = sectionObserver;
      sections.forEach((section) => sectionObserver.observe(section));
    }

    const hero = document.querySelector<HTMLElement>(".home-hero");
    const canAnimateGlow = hero &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      window.matchMedia("(pointer: fine)").matches;
    const moveGlow = (event: PointerEvent) => {
      if (!hero) return;
      const bounds = hero.getBoundingClientRect();
      hero.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
      hero.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
    };
    const clearGlow = () => {
      hero?.style.removeProperty("--pointer-x");
      hero?.style.removeProperty("--pointer-y");
    };
    if (canAnimateGlow) {
      hero.addEventListener("pointermove", moveGlow);
      hero.addEventListener("pointerleave", clearGlow);
    }
    return () => {
      observer?.disconnect();
      if (canAnimateGlow) {
        hero.removeEventListener("pointermove", moveGlow);
        hero.removeEventListener("pointerleave", clearGlow);
      }
    };
  }, [locale, messages.meta.description, messages.meta.title]);

  useEffect(() => {
    const controller = new AbortController();
    const query = `locale=${encodeURIComponent(locale)}`;

    fetch(`/api/site-content?${query}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Site content request failed with status ${response.status}`);
        return response.json() as Promise<SiteContent>;
      })
      .then(setSiteContent)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Unable to load homepage gallery, team, and sponsors.", error);
        setSiteError(locale === "fr"
          ? "Les photos et informations du site n’ont pas pu être chargées."
          : "Photos and site information could not be loaded.");
      });

    fetch(`/api/news?${query}&limit=3`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`News request failed with status ${response.status}`);
        const result: unknown = await response.json();
        if (!Array.isArray(result)) throw new Error("News API returned an invalid response");
        return result as NewsPost[];
      })
      .then(setNews)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Unable to load published news.", error);
        setNewsError(home.newsError);
      });

    return () => controller.abort();
  }, [home.newsError, locale]);

  const exploreItems: CardItem[] = home.exploreCards.map((card, index) => {
    const destinations = ["/#about", "/news.html", "/events.html", "/#join", "/#activities", "/resources.html", "/#awards"];
    const destination = new URL(destinations[index], "https://ieee-isitcom.invalid");
    destination.searchParams.set("locale", locale);
    return {
      id: index + 1,
      title: card.title,
      subtitle: `${locale === "fr" ? "Explorer" : "Explore"} · ${String(index + 1).padStart(2, "0")}`,
      description: card.description,
      imageUrl: "",
      icon: exploreIcons[index],
      href: `${destination.pathname}${destination.search}${destination.hash}`,
    };
  });

  const teamItems: CardItem[] = (siteContent?.team?.members ?? []).map((member) => ({
    id: member.id,
    title: member.name,
    subtitle: member.position,
    description: member.bio,
    imageUrl: member.photoUrl ?? "",
  }));
  const newsItems: CardItem[] = news.map((post) => ({
    id: post.id,
    title: post.title,
    subtitle: formatDate(post.publishedAt, locale) || (locale === "fr" ? "Actualité IEEE ISITCom" : "IEEE ISITCom news"),
    description: post.excerpt,
    imageUrl: post.coverImageUrl ?? "",
  }));

  return (
    <div className="home-page">
      <div className="space-decorations" aria-hidden="true">
        <div className="space-meteor-field">
          {Array.from({ length: 40 }, (_, index) => (
            <span
              className="space-meteor"
              key={index}
              style={{
                top: `${(index * 37) % 105 - 2}%`,
                left: `${(index * 47) % 105 - 2}%`,
                animationDelay: `${-((index * 7.31) % 52)}s`,
                animationDuration: `${34 + (index % 7) * 3}s`,
              }}
            />
          ))}
        </div>
        <span className="space-rock space-rock--one" />
        <span className="space-rock space-rock--two" />
        <span className="space-rock space-rock--three" />
        <span className="space-rock space-rock--four" />
        <span className="space-rock space-rock--five" />
        <span className="space-rock space-rock--six" />
        <span className="space-spark space-spark--one" />
        <span className="space-spark space-spark--two" />
        <span className="space-spark space-spark--three" />
        <span className="space-satellite">
          <svg viewBox="0 0 120 70" fill="none">
            <path d="M8 16h31v38H8zM81 16h31v38H81z" fill="#2563eb" fillOpacity=".42" stroke="#93c5fd" strokeWidth="2" />
            <path d="M18 16v38m11-38v38M91 16v38m11-38v38M8 29h31M8 42h31m42-13h31m-31 13h31" stroke="#bfdbfe" strokeOpacity=".8" />
            <path d="m43 25 13-9 13 9v22l-13 9-13-9V25Z" fill="#cbd5e1" stroke="#F4EDC6" strokeWidth="2" />
            <path d="M52 27h9v12h-9z" rx="3" fill="#0c4a6e" stroke="#7dd3fc" strokeWidth="2" />
            <path d="m56 54-4 10m8-10 4 10m-8-35-9-9m17 9 9-9" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <svg className="space-astronaut" viewBox="0 0 100 130" fill="none">
          <path d="M25 57 11 76l8 7 19-16M72 57l15 18-8 8-20-15" stroke="#c4b5fd" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m38 94-8 23m33-23 8 23" stroke="#c4b5fd" strokeWidth="12" strokeLinecap="round" />
          <path d="M35 48c0-10 7-18 16-18s16 8 16 18v41H35V48Z" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="4" />
          <rect x="36" y="49" width="29" height="19" rx="4" fill="#4c1d95" stroke="#c4b5fd" strokeWidth="2" />
          <text className="space-label-text space-label-text--aess" x="50.5" y="63" textAnchor="middle" fill="#F4EDC6" fontSize="9.5" fontWeight="900" stroke="#4c1d95" strokeWidth="1" paintOrder="stroke">AESS</text>
          <rect x="43" y="70" width="17" height="17" rx="5" fill="#a78bfa" />
          <circle cx="51" cy="23" r="20" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="4" />
          <path d="M39 21c0-7 5-12 12-12s12 5 12 12v5H39v-5Z" fill="#312e81" stroke="#c4b5fd" strokeWidth="2" />
          <path d="m37 43-7 7m35-7 7 7" stroke="#F4EDC6" strokeWidth="4" strokeLinecap="round" />
          <rect x="65" y="48" width="8" height="20" rx="3" fill="#0f3451" stroke="#94a3b8" strokeWidth="2" />
        </svg>
        <svg className="space-astronaut space-astronaut--female" viewBox="0 0 100 130" fill="none">
          <path d="M27 57 12 74l9 8 17-14m35-11 15 17-9 8-17-14" stroke="#f472b6" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m39 94-8 23m30-23 8 23" stroke="#f472b6" strokeWidth="12" strokeLinecap="round" />
          <path d="M34 48c0-10 7-18 16-18s16 8 16 18v41H34V48Z" fill="#fdf2f8" stroke="#ec4899" strokeWidth="4" />
          <rect x="37" y="51" width="27" height="14" rx="3" fill="#831843" stroke="#f472b6" strokeWidth="1.5" />
          <text className="space-label-text space-label-text--wee" x="50.5" y="61" textAnchor="middle" fill="#F4EDC6" fontSize="8.5" fontWeight="900" stroke="#831843" strokeWidth=".8" paintOrder="stroke">WEE</text>
          <rect x="43" y="70" width="17" height="17" rx="5" fill="#f9a8d4" />
          <circle cx="51" cy="23" r="20" fill="#fdf2f8" stroke="#f472b6" strokeWidth="3" />
          <path d="M34 25c-2-15 6-24 18-24 10 0 17 7 17 18-5-3-8-7-10-12-5 8-13 12-25 13Z" fill="#7c2d5a" />
          <path d="M39 21c0-7 5-12 12-12s12 5 12 12v5H39v-5Z" fill="#3b2540" stroke="#f9a8d4" strokeWidth="2" />
          <path d="m36 43-7 7m36-7 7 7" stroke="#fff1f7" strokeWidth="4" strokeLinecap="round" />
          <path d="M68 13c12 0 13 10 8 15" stroke="#7c2d5a" strokeWidth="5" strokeLinecap="round" />
          <rect x="65" y="49" width="8" height="19" rx="3" fill="#831843" stroke="#f9a8d4" strokeWidth="2" />
        </svg>
        <svg className="space-astronaut space-robot" viewBox="0 0 100 130" fill="none">
          <path d="M50 14V6m-5 0a5 5 0 1 1 10 0 5 5 0 0 1-10 0Z" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="25" y="17" width="50" height="37" rx="9" fill="#dcfce7" stroke="#22c55e" strokeWidth="4" />
          <path d="M20 30c-7 2-7 10 0 12m60-12c7 2 7 10 0 12" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
          <circle cx="39" cy="33" r="3" fill="#14532d" />
          <circle cx="61" cy="33" r="3" fill="#14532d" />
          <path d="M45 42h10" stroke="#14532d" strokeWidth="3" strokeLinecap="round" />
          <rect x="25" y="60" width="50" height="42" rx="8" fill="#f0fdf4" stroke="#22c55e" strokeWidth="4" />
          <path d="M30 63h40v17c-9 12-23 18-40 19V63Z" fill="#dcfce7" />
          <rect x="35" y="82" width="30" height="15" rx="4" fill="#14532d" stroke="#22c55e" strokeWidth="1.5" />
          <text className="space-label-text space-label-text--ras" x="50" y="92.5" textAnchor="middle" fill="#bbf7d0" fontSize="9" fontWeight="900" stroke="#14532d" strokeWidth="1" paintOrder="stroke">RAS</text>
          <path d="m25 67-7 7v17m57-24 7 7v17M39 102v14m22-14v14m-8-1h-9m31 0h-9" stroke="#22c55e" strokeWidth="5" strokeLinecap="round" />
          <circle cx="18" cy="73" r="5" fill="#f0fdf4" stroke="#22c55e" strokeWidth="3" />
          <circle cx="82" cy="73" r="5" fill="#f0fdf4" stroke="#22c55e" strokeWidth="3" />
          <path d="M17 91v6m66-6v6" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
          <path d="M35 120h9v4H31m34-4h-9v4h13" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p id="site-error" className="site-error" role="alert" hidden />
      <header className="site-header">
        <a className="site-brand" href={`/?locale=${locale}`} aria-label="IEEE ISITCom">
          <span className="ieee-mark">IEEE</span>
          <span><strong>ISITCom</strong><small>{home.brandSubline}</small></span>
        </a>
        <nav className="main-tabs" aria-label={home.navigation}>
          <details
            className="explore-nav-menu"
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") event.currentTarget.open = true;
            }}
            onPointerLeave={(event) => {
              const focusedElement = document.activeElement;
              const hasKeyboardFocus = focusedElement instanceof HTMLElement &&
                focusedElement.matches(":focus-visible") &&
                event.currentTarget.contains(focusedElement);
              if (event.pointerType === "mouse" && !hasKeyboardFocus) {
                event.currentTarget.open = false;
              }
            }}
          >
            <summary>
              {home.navExplore}
              <ChevronDown className="explore-nav-chevron" size={15} aria-hidden="true" />
            </summary>
            <ul className="explore-menu-panel">
              {exploreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <a className="explore-menu-link" href={item.href}>
                      {Icon && <Icon className="explore-menu-icon" size={19} aria-hidden="true" />}
                      <span>
                        <strong>{item.title}</strong>
                        {item.description && <span>{item.description}</span>}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </details>
          <a href="#gallery">{home.navGallery || nav.gallery}</a>
          <a href="#team">{nav.team}</a>
          <a
            className="join-nav-link"
            href="https://docs.google.com/forms/d/e/1FAIpQLSfwVr8wN9HID2Hp76hOteeJV0S9RIxNyTA09uc9tFSAQgW9rg/viewform"
            target="_blank"
            rel="noreferrer"
          >
            {nav.join}
            <ArrowRight className="join-nav-arrow" size={15} aria-hidden="true" />
          </a>
        </nav>
        <div className="header-actions" aria-label={home.chooseLanguage}>
          <a href="/?locale=fr" lang="fr" aria-current={locale === "fr" ? "page" : undefined}>FR</a>
          <a href="/?locale=en" lang="en" aria-current={locale === "en" ? "page" : undefined}>EN</a>
        </div>
      </header>
      <main>
        <section className="home-hero">
          <div className="hero-pointer-glow" aria-hidden="true" />
          <div className="hero-orbit" aria-hidden="true">
            <div className="orbit-card"><strong>IEEE</strong><span>ISITCom</span></div>
            <div className="orbit-moon-track" />
            <p className="orbit-label orbit-label-one"><span>ISITCOM</span></p>
            <p className="orbit-label orbit-label-two"><span>SB</span></p>
            <div className="orbit-satellite-track" />
            <svg className="orbit-satellite" viewBox="0 0 48 32" focusable="false">
              <rect x="17" y="10" width="14" height="12" rx="3" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1.5" />
              <path d="M17 13H5v6h12M31 13h12v6H31" fill="#0e7490" stroke="#7dd3fc" strokeWidth="1.5" />
              <path d="M24 10V5m-3 0h6M24 22v5" fill="none" stroke="#e0f2fe" strokeLinecap="round" strokeWidth="1.5" />
              <circle cx="24" cy="16" r="2" fill="#38bdf8" />
            </svg>
          </div>
          <div className="hero-copy">
            <h1>
              <TextReveal
                as="span"
                className="hero-title-line hero-title-main"
                per="word"
                preset="fade-in-blur"
                replayOnHover
                speedReveal={1.2}
              >
                {home.heroTitle}
              </TextReveal>
              <TextReveal
                as="span"
                className="hero-title-line hero-title-highlight"
                per="word"
                preset="fade-in-blur"
                speedReveal={1.2}
                delay={0.2}
                replayOnHover
              >
                {home.heroHighlight}
              </TextReveal>
            </h1>
            <p className="hero-description">{home.heroDescription}</p>
            <div className="hero-actions">
              <a className="button light" href="#join">{nav.join}</a>
              <a className="button outline" href="#about">{home.discover}</a>
            </div>
            <p className="hero-location"><strong>IEEE</strong><span>{home.networkLabel}</span><span>{home.location}</span></p>
          </div>
        </section>

        <section className="site-section about-section" id="about">
          <div><p className="section-eyebrow">{home.aboutEyebrow}</p><h2>{home.aboutTitle}</h2></div>
          <div><p>{home.aboutDescription}</p><a href="#join">{home.aboutLink}</a></div>
        </section>

        <section className="site-section gallery-section" id="gallery">
          <div className="activities-head">
            <div><p className="section-eyebrow">{home.galleryEyebrow}</p><h2>{home.galleryTitle}</h2></div>
            <p>{home.galleryIntro}</p>
          </div>
          {siteError && <p className="site-error" role="alert">{siteError}</p>}
          {galleryItems.length > 0 ? (
            <PhotoWheelGallery
              photos={galleryItems}
              label={home.galleryCarouselLabel}
              photoLabel={home.galleryPhoto}
            />
          ) : (
            !siteError && <p className="empty-note">{home.galleryEmpty}</p>
          )}
        </section>

        <section className="site-section activities-section" id="activities">
          <div className="activities-head">
            <div><p className="section-eyebrow">{home.activitiesEyebrow}</p><h2>{home.activitiesTitle}</h2></div>
            <p>{home.activitiesIntro}</p>
          </div>
          <div className="activities-list">
            {[
              [home.activities.workshopsTitle, home.activities.workshopsDescription],
              [home.activities.projectsTitle, home.activities.projectsDescription],
              [home.activities.networkTitle, home.activities.networkDescription],
            ].map(([title, description]) => (
              <article className="activity-row" key={title}><h3>{title}</h3><p>{description}</p></article>
            ))}
          </div>
        </section>

        <section className="site-section team-section" id="team">
          <div className="activities-head">
            <div><p className="section-eyebrow">{home.teamEyebrow}</p><h2>{home.teamTitle}</h2></div>
            <p>{home.teamIntro}</p>
          </div>
          {siteError && <p className="site-error" role="alert">{siteError}</p>}
          {teamItems.length ? (
            <HoverRevealCards items={teamItems} className="team-grid" />
          ) : (
            !siteError && <p className="empty-note">{home.teamEmpty}</p>
          )}
        </section>

        <section className="site-section award-section" id="awards">
          <div className="section-intro">
            <p className="section-eyebrow">{home.awardsEyebrow}</p>
            <h2>{home.awardsTitle}</h2>
            <p>{home.awardsDescription}</p>
          </div>
          {siteContent?.milestones.length ? (
            <div className="milestone-list">
              {siteContent.milestones.map((milestone) => (
                <article className="milestone-card" key={milestone.id}>
                  <time dateTime={milestone.happenedAt}>{new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${milestone.happenedAt}T12:00:00Z`))}</time>
                  <h3>{milestone.title}</h3>
                  {milestone.description && <p>{milestone.description}</p>}
                </article>
              ))}
            </div>
          ) : (
            !siteError && <p className="empty-note">{home.milestonesEmpty}</p>
          )}
        </section>

        <section className="site-section news-section" id="news">
          <div className="activities-head">
            <div><p className="section-eyebrow">{home.newsEyebrow}</p><h2>{home.newsTitle}</h2></div>
            <p>{home.newsIntro}</p>
          </div>
          {newsError && <p className="site-error" role="alert">{newsError}</p>}
          {newsItems.length ? (
            <HoverRevealCards items={newsItems} className="news-grid" />
          ) : (
            !newsError && <p className="empty-note">{home.newsEmpty}</p>
          )}
          <a className="section-link" href={`/news.html?locale=${locale}`}>{home.newsMore}</a>
        </section>

        <section className="join-section" id="join">
          <div><p className="section-eyebrow">{home.joinEyebrow}</p><h2>{home.joinTitle}</h2><p>{home.joinDescription}</p></div>
          <div className="join-actions">
            <a className="button light" href="https://docs.google.com/forms/d/e/1FAIpQLSfwVr8wN9HID2Hp76hOteeJV0S9RIxNyTA09uc9tFSAQgW9rg/viewform" target="_blank" rel="noreferrer">{home.joinFormCta}</a>
            <a className="button outline" href="https://www.ieee.org/membership/join/index.html" target="_blank" rel="noreferrer">{home.joinCta}</a>
          </div>
        </section>

        <section className="site-section sponsors-section" id="sponsors">
          <div className="activities-head">
            <div><p className="section-eyebrow">{home.sponsorsEyebrow}</p><h2>{home.sponsorsTitle}</h2></div>
            <p>{home.sponsorsIntro}</p>
          </div>
          {siteError && <p className="site-error" role="alert">{siteError}</p>}
          {siteContent?.sponsors.length ? (
            <div className="sponsors-grid">
              {siteContent.sponsors.map((sponsor) => {
                const content = (
                  <>
                    {sponsor.logoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="sponsor-logo" src={sponsor.logoUrl} alt="" loading="lazy" />
                    )}
                    <span>{sponsor.name}</span>
                  </>
                );
                return sponsor.websiteUrl ? (
                  <a className="sponsor-card" href={sponsor.websiteUrl} key={sponsor.id} target="_blank" rel="noreferrer">{content}</a>
                ) : (
                  <article className="sponsor-card" key={sponsor.id}>{content}</article>
                );
              })}
            </div>
          ) : (
            !siteError && <p className="empty-note">{home.sponsorsEmpty}</p>
          )}
        </section>
      </main>
      <footer className="site-footer">
        <p><strong>IEEE ISITCom</strong> · <span>{home.location}</span></p>
        <p>{home.footerLine}</p>
      </footer>
    </div>
  );
}
