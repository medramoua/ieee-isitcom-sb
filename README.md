# IEEE ISITCom Student Branch — website

Next.js 14 · HTML/CSS/JavaScript pages · TypeScript API/backend · Prisma/PostgreSQL · NextAuth.

**New to the code?** Start with [`docs/PROJECT-GUIDE.md`](docs/PROJECT-GUIDE.md). It explains where the pages and features live in plain language.
Technical architecture and permissions: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

> Status: The French and English homepage, events, news, and resources pages are available. Admin users can manage content and the homepage gallery, team, and sponsors.

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
- Homepage administration (admins): `/admin/site` for gallery photos, team members, and sponsors.
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
| Change the home page layout | `public/index.html`, `public/js/home.js`, and `public/css/site.css` |
| Change French or English wording | `src/i18n/messages/fr.json` or `en.json` |
| Change the events page | `public/events.html`, `public/js/events.js`, and `public/css/events.css` |
| Change admin UI | `public/admin.html`, `public/js/admin.js`, and `public/css/admin.css` |
| Change protected data APIs | `src/app/api/` |
| Change content create/edit behavior | `src/features/content/actions.ts` |
| Change login, roles, or password rules | `src/features/auth/` |
| Change database tables | `prisma/schema.prisma` |

Page interfaces are static HTML in `public/`, with CSS in `public/css/` and browser JavaScript in `public/js/`. The Next.js middleware maps the public URLs to those files, while TypeScript API routes keep database, authentication, and validation work on the server.

### Public page background

The animated molten-blue background is added only to the public home, events, news, and resources pages by `public/js/molten-background.js` and `public/css/molten-background.css`. It renders in a low-resolution WebGL canvas when available and falls back to CSS gradients if WebGL is unavailable. The layer is decorative, cannot intercept clicks, and respects reduced-motion preferences; it is not included on admin pages.

### Admin photo uploads

Admins can drag and drop or choose JPEG, PNG, WebP, or GIF images (up to 8 MB) for content, gallery photos, team profiles, and sponsor logos. Enable uploads by setting `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in the server's private environment configuration. Keep these values out of browser code and do not share them with content editors; the server handles uploads and stores image references. Homepage gallery, team, and sponsor content is managed at `/admin/site`.
