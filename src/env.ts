import "server-only";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  NEXTAUTH_URL: z.string().url().optional().or(z.literal("")),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 chars (openssl rand -base64 32)"),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  CLOUDINARY_CLOUD_NAME: z.string().regex(/^[A-Za-z0-9_-]+$/).optional().or(z.literal("")),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("IEEE ISITCom <no-reply@example.com>"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables (see above). Check your .env file.");
}

export const env = parsed.data;
