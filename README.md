# IEEE ISITCom Student Branch — website

Next.js 14 · HTML/CSS/JavaScript pages · TypeScript API/backend · Prisma/PostgreSQL · NextAuth.

**New to the code?** Start with [`docs/PROJECT-GUIDE.md`](docs/PROJECT-GUIDE.md). It explains where the pages and features live in plain language.
Technical architecture and permissions: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

> Status: **Phase 2A — admin foundation and content management.** The landing page is available in French and English; admin dashboard and events, news, and projects CRUD are implemented. Remaining public pages, admin modules, and extras are still planned.

## Run locally

```powershell
npm install
Copy-Item .env.example .env
# Edit .env and set DATABASE_URL, DIRECT_URL, and a random NEXTAUTH_SECRET.
npx prisma migrate dev
npm run db:seed
npm run dev
```

- Open http://localhost:3000 for the French landing page; use the language switcher or visit `/en` for English.
- Admin: http://localhost:3000/admin/login — use the seed output for credentials; first login forces a password change.
- Admin sessions expire after 30 minutes and are cleared when you leave the admin area for the public site. You can also sign out from the admin header.
- Content admin: `/admin/content/events`, `/admin/content/news`, and `/admin/content/projects`.
- Password-reset emails are printed in the terminal while `RESEND_API_KEY` is empty.

If you have already configured `.env` and applied the migration, start directly with `npm run dev`. The local `.env` file contains secrets and must not be shared or committed.

Optional but recommended, once, for search + "single current board":
see **§4 Raw SQL migration** in `docs/ARCHITECTURE.md`.

## Scripts

| Command | What |
|---|---|
| `npm run dev` | dev server |
| `npm run typecheck` / `npm run lint` | checks |
| `npm run db:migrate` | create/apply migrations (dev) |
| `npm run db:deploy` | apply migrations (production) |
| `npm run db:seed` | base seed (idempotent) |
| `npm run db:studio` | Prisma Studio |

## Where to make common changes

| I want to… | Start here |
|---|---|
| Change the home page layout | `public/index.html`, `public/home.js`, and `public/site.css` |
| Change French or English wording | `messages/fr.json` or `messages/en.json` |
| Change the events page | `public/events.html`, `public/events.js`, and `public/events.css` |
| Change admin UI | `public/admin.html`, `public/admin.js`, and `public/admin.css` |
| Change protected data APIs | `src/app/api/` |
| Change content create/edit behavior | `src/features/content/actions.ts` |
| Change login, roles, or password rules | `src/features/auth/` |
| Change database tables | `prisma/schema.prisma` |

Page interfaces are static HTML, CSS, and browser JavaScript under `public/`. The Next.js middleware maps the public URLs to those files, while TypeScript API routes keep database, authentication, and validation work on the server.
