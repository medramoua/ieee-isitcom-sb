import "server-only";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { env } from "@/env";

let client: Resend | null = null;
const getClient = () => (client ??= new Resend(env.RESEND_API_KEY));

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  template: string; // "password-reset", ...
  relatedType?: string;
  relatedId?: string;
  sentById?: string;
};

/** Sends via Resend and logs every attempt in EmailLog. Without RESEND_API_KEY (dev) it prints the text version. */
export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; error?: string }> {
  const { to, subject, html, text, template, relatedType, relatedId, sentById } = input;

  if (!env.RESEND_API_KEY) {
    console.info(`\n[email:dev] to=${to}\nsubject=${subject}\n${text}\n`);
    return { ok: true };
  }

  try {
    const { data, error } = await getClient().emails.send({ from: env.EMAIL_FROM, to, subject, html, text });
    await db.emailLog.create({
      data: {
        to,
        subject,
        template,
        relatedType,
        relatedId,
        sentById,
        status: error ? "FAILED" : "SENT",
        providerId: data?.id,
        error: error?.message,
      },
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    await db.emailLog
      .create({ data: { to, subject, template, relatedType, relatedId, sentById, status: "FAILED", error: message } })
      .catch(() => {});
    return { ok: false, error: message };
  }
}
