/**
 * Base seed (Phase 1): first Super Admin + SiteSettings singleton.
 * Idempotent — never overwrites an existing admin. Sample content comes in Phase 3.
 *
 *   npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const db = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@ieee-isitcom.tn").trim().toLowerCase();
  const generated = !process.env.SEED_ADMIN_PASSWORD;
  const password = process.env.SEED_ADMIN_PASSWORD || randomBytes(12).toString("base64url");

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`• Admin ${email} already exists — left untouched.`);
  } else {
    await db.user.create({
      data: {
        email,
        name: "Super Admin",
        role: "SUPER_ADMIN",
        passwordHash: await bcrypt.hash(password, 12),
        mustChangePassword: true, // forced change on first login
      },
    });
    console.log("✔ Super Admin created");
    console.log(`  email:    ${email}`);
    console.log(`  password: ${generated ? password : "(from SEED_ADMIN_PASSWORD)"}`);
    if (generated) console.log("  ⚠ shown once — you must change it at first login.");
  }

  await db.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      tagline: {
        fr: "Faire avancer la technologie au service de l'humanité",
        en: "Advancing technology for humanity",
      },
      socials: {},
      externalLinks: { ieeeOrg: "https://www.ieee.org" },
      features: { registrations: true, applications: true, newsletter: true },
    },
  });
  console.log("✔ Site settings ready");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
