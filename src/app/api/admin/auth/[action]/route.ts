import { changePassword, requestPasswordReset, resetPassword } from "@/features/auth/actions";

export async function POST(request: Request, { params }: { params: { action: string } }) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return Response.json({ ok: false, error: "Requête non autorisée." }, { status: 403 });
  }

  const input: unknown = await request.json();
  if (!input || typeof input !== "object") {
    return Response.json({ ok: false, error: "Données invalides." }, { status: 400 });
  }
  const result = params.action === "forgot"
    ? await requestPasswordReset(input)
    : params.action === "reset"
      ? await resetPassword(input)
      : params.action === "change"
        ? await changePassword(input)
        : null;
  if (!result) return Response.json({ ok: false, error: "Action invalide." }, { status: 404 });
  return Response.json(result);
}
