/** Plain-HTML email templates (inline styles, no extra deps). Rich per-event emails come in Phase 2. */

const BLUE = "#00629B";
const NAVY = "#0B1F3A";

export function emailLayout(opts: { title: string; bodyHtml: string }): string {
  return `<!doctype html>
<html lang="fr"><body style="margin:0;background:#f3f6f9;font-family:Arial,Helvetica,sans-serif;color:${NAVY};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden;">
      <tr><td style="background:${BLUE};padding:18px 24px;color:#ffffff;font-weight:bold;font-size:18px;">IEEE ISITCom Student Branch</td></tr>
      <tr><td style="padding:28px 24px;line-height:1.55;font-size:15px;">
        <h1 style="margin:0 0 16px;font-size:20px;">${opts.title}</h1>
        ${opts.bodyHtml}
      </td></tr>
      <tr><td style="padding:16px 24px;background:#f3f6f9;font-size:12px;color:#5b6b7b;">
        ISITCom Hammam Sousse — message automatique, merci de ne pas répondre.
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

export function passwordResetEmail(url: string) {
  const subject = "Réinitialisation de votre mot de passe";
  const html = emailLayout({
    title: subject,
    bodyHtml: `
      <p>Une demande de réinitialisation du mot de passe a été faite pour votre compte administrateur.</p>
      <p style="margin:24px 0;"><a href="${url}" style="background:${BLUE};color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;font-weight:bold;">Choisir un nouveau mot de passe</a></p>
      <p>Ce lien est valable 1 heure et ne peut être utilisé qu'une fois. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>`,
  });
  const text = `${subject}\n\nChoisissez un nouveau mot de passe (lien valable 1 heure) :\n${url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.`;
  return { subject, html, text };
}
