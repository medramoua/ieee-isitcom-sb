# IEEE ISITCom Student Branch — Architecture (Phase 0)

## 1. Key decisions

| Area | Decision | Why |
|---|---|---|
| Framework | Next.js 14 App Router, TypeScript strict, server actions for admin mutations, route handlers for public/forms/files | One codebase, no separate API |
| i18n | `next-intl` v3, locales `fr` (default, no prefix) and `en`, `localePrefix: "as-needed"`, `hreflang` alternates in metadata | Clean FR URLs, proper SEO |
| Admin language | French only (v1). Lives outside `[locale]` at `/admin` | Board members use FR; avoids 3x admin strings |
| Dynamic content i18n | `Json` columns shaped `{fr, en?}`, `fr` required, fallback to `fr`. One slug per entity (not per locale) | Zero extra tables, simple admin forms |
| Rich text | TipTap → sanitized HTML (`sanitize-html`) stored per locale | Easy render, easy search |
| Publishing | `status` (DRAFT → IN_REVIEW → PUBLISHED → ARCHIVED) + `publishedAt`. Public = `PUBLISHED AND publishedAt <= now()`. Scheduling = publish with a future date | No cron needed (Vercel Hobby only allows daily crons); pages use ISR `revalidate = 60` |
| Auth | NextAuth v4 (stable), credentials provider, JWT session (httpOnly, SameSite=Lax), 30-minute lifetime, cleared when navigating from admin to the public site, bcryptjs cost 12, lockout after 5 fails, `isActive` re-checked in the JWT callback | No Account/Session tables, instant revocation |
| Authorization | `can(role, action)` helper used in every server action + admin layout guard + middleware on `/admin/*` | Never trust the UI |
| CSRF | Server actions: built-in Origin check. Route handlers: Origin/Host check helper + SameSite cookies. NextAuth: built-in CSRF token | No custom tokens |
| Validation | Zod schemas shared by forms (react-hook-form) and server | Single source of truth |
| Images | Cloudinary, stored as `public_id` strings, signed direct uploads (`/api/upload/sign`), `next-cloudinary` for delivery | No FK mess, free transformations |
| Files (resources) | Cloudinary `auto` upload, URL + name + size stored on `Resource` | Same pipeline |
| Email | Resend + plain-HTML template helpers (`lib/email/templates.ts`), every send logged in `EmailLog` | Traceable, no extra deps |
| Rate limit | Postgres table `RateLimitBucket` (fixed window) + honeypot + min-fill-time trap; reCAPTCHA v3 behind a `verifyCaptcha()` interface (swap to Turnstile later) | Serverless-safe, no Redis |
| Search | Postgres `ILIKE`/`pg_trgm` over `searchText` of Post/Event/Project, `/api/search` + `/search` page | No external service |
| QR check-in | Registration gets random `qrToken`; QR (`qrcode` lib) emailed on approval; admin scanner (`@yudiel/react-qr-scanner`) hits `/api/checkin` | Works on phones at the door |
| Certificates | `@react-pdf/renderer`, generated on demand at `/api/certificates/[code]`, public verify page `/verify/[code]`, snapshot fields in `Certificate` | No file storage |
| Analytics | Vercel Analytics + Speed Insights by default (cookieless); Plausible optional via env | Cookie notice stays informational |
| Stats on home | events + projects computed from DB; member count = manual `SiteSettings.statsOverride.members` | No members table in v1 |
| Audit | `audit()` helper called inside every mutating server action | Full trail |

## 2. Roles & permissions

| Capability | Editor | Admin | Super Admin |
|---|:-:|:-:|:-:|
| Create/edit drafts: events, news, projects, albums, resources | ✅ | ✅ | ✅ |
| Submit for review | ✅ | ✅ | ✅ |
| Publish / unpublish / schedule / archive | ❌ | ✅ | ✅ |
| Delete content | ❌ | ✅ | ✅ |
| Team, chapters, sponsors, milestones, page content | ❌ (read) | ✅ | ✅ |
| Registrations, applications, inbox, subscribers (view / approve / export / email) | ❌ | ✅ | ✅ |
| QR check-in scanner | ✅ | ✅ | ✅ |
| Site settings | ❌ | ✅ | ✅ |
| Users & roles, audit log | ❌ | ❌ | ✅ |

## 3. Planned folder structure

This is the intended end-state, not a list of files that already exist. For the current code, use the beginner-friendly [project guide](./PROJECT-GUIDE.md).

```
isitcom-ieee/
├─ prisma/
│  ├─ schema.prisma
│  ├─ seed.ts                      # super admin + settings (P1), sample content (P3)
│  └─ migrations/
├─ public/
│  ├─ logos/ (ieee.svg, isitcom.svg, branch.svg — placeholders)
│  └─ fonts/ (Inter)
├─ src/
│  ├─ middleware.ts                # next-intl for public, auth guard for /admin
│  ├─ i18n/
│  │  ├─ routing.ts  request.ts  navigation.ts
│  │  └─ messages/                 # next-intl dictionaries (fr.json, en.json)
│  ├─ app/
│  │  ├─ [locale]/
│  │  │  ├─ layout.tsx             # <html lang dir>, fonts, theme + intl providers
│  │  │  ├─ (site)/
│  │  │  │  ├─ page.tsx                          # Home
│  │  │  │  ├─ about/page.tsx
│  │  │  │  ├─ team/page.tsx
│  │  │  │  ├─ events/page.tsx  calendar/page.tsx  [slug]/page.tsx
│  │  │  │  ├─ projects/page.tsx  [slug]/page.tsx
│  │  │  │  ├─ news/page.tsx  [slug]/page.tsx
│  │  │  │  ├─ chapters/page.tsx  [slug]/page.tsx
│  │  │  │  ├─ resources/page.tsx
│  │  │  │  ├─ gallery/page.tsx  [slug]/page.tsx
│  │  │  │  ├─ join/page.tsx
│  │  │  │  ├─ contact/page.tsx
│  │  │  │  ├─ sponsors/page.tsx
│  │  │  │  ├─ search/page.tsx
│  │  │  │  ├─ verify/[code]/page.tsx            # certificate verification
│  │  │  │  ├─ newsletter/confirm/page.tsx  unsubscribe/page.tsx
│  │  │  │  └─ privacy/page.tsx
│  │  │  ├─ not-found.tsx  error.tsx  loading.tsx
│  │  ├─ admin/
│  │  │  ├─ login/page.tsx  forgot-password/  reset-password/
│  │  │  └─ (panel)/
│  │  │     ├─ layout.tsx          # sidebar, session guard, role-aware nav
│  │  │     ├─ page.tsx            # dashboard
│  │  │     ├─ events/  [id]/  new/  [id]/registrations/
│  │  │     ├─ check-in/
│  │  │     ├─ news/  projects/  chapters/  gallery/
│  │  │     ├─ team/ (boards + members)
│  │  │     ├─ sponsors/ (partners + packages)
│  │  │     ├─ resources/  pages/ (PageContent + milestones)
│  │  │     ├─ applications/  messages/  subscribers/
│  │  │     ├─ media/
│  │  │     ├─ users/  settings/  audit/  profile/
│  │  ├─ api/
│  │  │  ├─ auth/[...nextauth]/route.ts
│  │  │  ├─ upload/sign/route.ts
│  │  │  ├─ search/route.ts
│  │  │  ├─ checkin/route.ts
│  │  │  ├─ certificates/[code]/route.ts           # PDF
│  │  │  ├─ export/[kind]/route.ts                 # CSV (registrations, applications, subscribers)
│  │  │  └─ public/{contact,join,register,newsletter}/route.ts
│  │  ├─ sitemap.ts  robots.ts  manifest.ts  opengraph-image.tsx
│  │  └─ global-error.tsx
│  ├─ components/
│  │  ├─ ui/                       # shadcn/ui
│  │  ├─ layout/                   # header, footer, lang-switcher, theme-toggle, cookie-notice
│  │  ├─ site/                     # hero, stats, event-card, post-card, sponsor-strip, timeline, calendar...
│  │  ├─ forms/                    # contact, join, event-registration, newsletter (honeypot built in)
│  │  └─ admin/                    # shared admin interface pieces
│  ├─ features/
│  │  ├─ auth/                     # session, permissions, password actions and validation
│  │  └─ content/                  # content forms, save actions, dates and localized fields
│  ├─ lib/
│  │  ├─ db.ts                     # Prisma singleton
│  │  ├─ audit.ts
│  │  ├─ rate-limit.ts  honeypot.ts  captcha.ts  csrf.ts
│  │  ├─ cloudinary.ts  sanitize.ts  slug.ts  csv.ts  qr.ts
│  │  ├─ seo.ts  search.ts  dates.ts
│  │  ├─ content/                  # visibility filters + localized getters (pick(locale, json))
│  │  ├─ validators/               # zod schemas per entity
│  │  ├─ email/                    # resend client + react-email templates
│  │  └─ pdf/certificate.tsx
│  ├─ hooks/
│  └─ types/                       # LocalizedText, next-auth.d.ts, etc.
├─ .env.example
├─ components.json  tailwind.config.ts  next.config.mjs  tsconfig.json
├─ package.json  vercel.json
└─ README.md
```

## 4. Raw SQL migration (run once, after the first `prisma migrate dev`)

```bash
npx prisma migrate dev --create-only --name extras
```

Paste into the generated `migration.sql`, then `npx prisma migrate dev`:

```sql
-- fuzzy site search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "Post_searchText_trgm"    ON "Post"    USING gin ("searchText" gin_trgm_ops);
CREATE INDEX "Event_searchText_trgm"   ON "Event"   USING gin ("searchText" gin_trgm_ops);
CREATE INDEX "Project_searchText_trgm" ON "Project" USING gin ("searchText" gin_trgm_ops);

-- only one current board
CREATE UNIQUE INDEX "Board_single_current" ON "Board" ("isCurrent") WHERE "isCurrent" = true;
```

## 5. Data model map

- **Auth/ops:** User, PasswordResetToken, AuditLog, EmailLog, RateLimitBucket
- **Content:** Event, Post, Project (+ProjectMember), Album (+AlbumPhoto), Resource, Category, Tag, Milestone, PageContent
- **People/org:** Board, TeamMember, Chapter, Sponsor, SponsorshipPackage
- **Inbound:** EventRegistration, Certificate, MembershipApplication, ContactMessage (+ContactReply), NewsletterSubscriber
- **Config/media:** SiteSettings (singleton), Media

## 6. Build phases

| Phase | Output |
|---|---|
| **1 — Foundation + Auth** | package.json, configs, Tailwind/shadcn theme (IEEE blue, dark mode), next-intl + middleware, Prisma client, NextAuth (lockout, roles), `can()`, `audit()`, rate limiter, login/reset pages, base seed (super admin + settings), `.env.example` |
| **2 — Admin** | Panel layout, dashboard, shared admin components (DataTable, LocalizedInput, TipTap, ImageUploader, PublishBar), CRUD for every module, registrations/applications/inbox with approve/reject/email/CSV, users, settings, audit viewer |
| **3 — Public site** | Header/footer/lang/theme, all 12 pages + search + 404/500, forms with honeypot + rate limit, SEO (metadata, OG, sitemap, JSON-LD), cookie notice, full sample-data seed |
| **4 — Extras + ship** | QR + check-in scanner, certificates PDF + verify page, newsletter double opt-in, analytics, reCAPTCHA, a11y/Lighthouse pass, README, deploy guide (Vercel + Neon/Supabase, Cloudinary, Resend) |
