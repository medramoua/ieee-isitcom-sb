"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, BookOpen, Bot, CalendarDays, Newspaper, Rocket, Trophy } from "lucide-react";
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
    const sections = links.map((link) => document.querySelector(link.hash)).filter((section): section is Element => Boolean(section));
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
      <p id="site-error" className="site-error" role="alert" hidden />
      <header className="site-header">
        <a className="site-brand" href={`/?locale=${locale}`} aria-label="IEEE ISITCom">
          <span className="ieee-mark">IEEE</span>
          <span><strong>ISITCom</strong><small>{home.brandSubline}</small></span>
        </a>
        <nav className="main-tabs" aria-label={home.navigation}>
          <a href="#explore">{home.navExplore}</a>
          <a href="#gallery">{home.navGallery || nav.gallery}</a>
          <a href="#team">{nav.team}</a>
        </nav>
        <div className="header-actions" aria-label={home.chooseLanguage}>
          <a href="/?locale=fr" lang="fr" aria-current={locale === "fr" ? "page" : undefined}>FR</a>
          <a href="/?locale=en" lang="en" aria-current={locale === "en" ? "page" : undefined}>EN</a>
        </div>
      </header>
      <main>
        <section className="home-hero">
          <div className="hero-pointer-glow" aria-hidden="true" />
          <div className="hero-copy">
            <p className="eyebrow">{home.eyebrow}</p>
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
              <a className="button outline" href="#explore">{home.discover}</a>
            </div>
            <p className="hero-location"><strong>IEEE</strong><span>{home.networkLabel}</span><span>{home.location}</span></p>
          </div>
          <div className="hero-orbit" aria-hidden="true">
            <div className="orbit-card"><strong>IEEE</strong><span>ISITCom</span></div>
            <p className="orbit-label orbit-label-one">ISITCOM</p>
            <p className="orbit-label orbit-label-two">SB</p>
          </div>
        </section>

        <section className="site-section explore-section" id="explore">
          <div className="section-intro">
            <p className="section-eyebrow">{home.exploreEyebrow}</p>
            <h2>{home.exploreTitle}</h2>
            <p>{home.exploreDescription}</p>
          </div>
          <HoverRevealCards items={exploreItems} className="explore-card-grid" />
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
              closeLabel={home.galleryClose}
              previousLabel={home.galleryPrevious}
              nextLabel={home.galleryNext}
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
