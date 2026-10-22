# Project guide — plain-language map

You do not need to understand every file to work on the website. Most changes start in one of the folders below.

## First, how a website request works

1. **`src/app/` and `src/components/` contain the homepage.** The remaining static pages are in `public/`; their CSS and browser JavaScript are in `public/css/` and `public/js/`.
2. **`src/app/api/` contains server endpoints** for login, protected admin actions, translations, and database-backed content.
3. **`src/features/` contains server behavior** behind features, such as login, permissions, and editing content.
4. **`src/lib/` contains shared services** used by multiple features, such as the database, email, and audit log.

For example, the admin events list is rendered by `public/js/admin.js`. It fetches protected content through `src/app/api/admin/`; server-side validation and Prisma writes remain in `src/features/content/actions.ts`.

## The folders

| Folder | What belongs there |
|---|---|
| `public/` | Static pages: `events.html`, `news.html`, `resources.html`, and `admin.html`. Shared styles are in `public/css/`; browser JavaScript is in `public/js/`. |
| `src/app/` | The React homepage and Next.js API routes. |
| `src/components/` | Reusable homepage sections and UI components. |
| `src/app/api/` | TypeScript backend endpoints for database-backed content, admin actions, translations, and NextAuth. |
| `src/features/auth/` | Sign-in, password recovery, permission rules, and role checks. |
| `src/features/content/` | Server validation and save/delete behavior for events, news, and projects. |
| `src/lib/` | Shared technical services: Prisma database connection, email, audit logging, rate limiting, and request helpers. |
| `src/i18n/` | Which languages are enabled, how language routing works, and the text shown to visitors (`src/i18n/messages/fr.json` and `en.json`). |
| `prisma/` | Database structure, migrations, and the initial admin seed. |

The current source tree, in short:

```text
public/
├─ events.html          Events page markup
├─ news.html            News page markup
├─ resources.html       Resources page markup
├─ admin.html           Admin page shell
├─ css/                 Shared and page-specific styles
└─ js/                  Browser interactions for static pages

src/
├─ app/                 React homepage + API routes
├─ components/          Homepage sections and reusable UI
├─ features/            Authentication and content behavior
├─ i18n/                Language config + messages/ (fr.json, en.json)
├─ lib/                 Shared services such as database and email
└─ middleware.ts        Public URL mapping and admin access checks
```

The backend still uses Next.js conventions:

- API route handlers live under `src/app/api/`.
- `.next/` and `node_modules/` are generated/dependency folders. You normally do not edit files inside them.

## Common tasks

### Change the home page

The home page is a React page in `src/app/page.tsx`; its sections and data loading are in `src/components/site/home-page.tsx`. The reusable hover-reveal card component is in `src/components/ui/cards.tsx`, with its styles alongside it. Edit `src/i18n/messages/fr.json` and `en.json` for wording, keeping their translation keys in sync. Events, news, and resources remain static pages in `public/`.

### Add or edit an event, news item, or project

The admin routes are:

- `/admin/content/events`
- `/admin/content/news`
- `/admin/content/projects`

Their shared form and save logic live in `src/features/content/`. The `[kind]` folder in the route path is Next.js shorthand for one of those three content types.

Published events appear on the public `/events` page (English: `/en/events`). Drafts and events scheduled for the future stay hidden until their publication time. The static UI is `public/events.html`, `public/css/events.css`, and `public/js/events.js`; the list data comes from `src/app/api/events/`.

### Change who can use the admin

Start with `src/features/auth/permissions.ts` for role capabilities. `src/features/auth/session.ts` checks the signed-in user, and `src/features/auth/actions.ts` handles password actions.

### Change the database

Edit `prisma/schema.prisma`, then create and apply a migration with `npx prisma migrate dev`. Do not edit an already-applied migration to change your live database.

## What the main files do

- `src/middleware.ts` routes languages and protects the admin area.
- `src/env.ts` checks required environment variables when the server starts.
- `src/lib/db.ts` creates the shared Prisma database client.
- `prisma/seed.ts` creates the initial admin account and default site settings.
- `README.md` has the Windows commands to install and run the project.

## A safe way to make changes

1. Find the matching task above instead of opening files at random.
2. Change the page or feature file listed there.
3. Run `npm test`, `npm run typecheck`, and `npm run lint`.
4. Run `npm run dev` and test the page in your browser.

You can ask for help by describing the screen or behavior you want to change; you do not need to know the name of the file first.
