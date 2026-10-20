import { deleteContent, saveContent } from "@/features/content/actions";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return Response.json({ error: "Requête non autorisée." }, { status: 403 });
  }

  const formData = await request.formData();
  const action = formData.get("action");
  const result = action === "delete"
    ? await deleteContent(formData)
    : action === "save"
      ? await saveContent(formData)
      : { error: "Action invalide." };
  return Response.json(result);
}
