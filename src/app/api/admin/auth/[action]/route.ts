import { changePassword, requestPasswordReset, resetPassword } from "@/features/auth/actions";

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return Response.json({ ok: false, error: "Requête non autorisée." }, { status: 403 });
  }

  const input: unknown = await request.json();
  if (!input || typeof input !== "object") {
    return Response.json({ ok: false, error: "Données invalides." }, { status: 400 });
  }
  const result = action === "forgot"
    ? await requestPasswordReset(input)
    : action === "reset"
      ? await resetPassword(input)
      : action === "change"
        ? await changePassword(input)
        : null;
  if (!result) return Response.json({ ok: false, error: "Action invalide." }, { status: 404 });
  return Response.json(result);
}
