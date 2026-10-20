import { createHash, randomUUID } from "crypto";
import { env } from "@/env";
import { requireAction, ForbiddenError } from "@/features/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/request";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_REQUEST_SIZE = MAX_FILE_SIZE + 64 * 1024;
const MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function getImageMime(bytes: Uint8Array) {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  const signature = String.fromCharCode(...bytes.subarray(0, 6));
  if (signature === "GIF87a" || signature === "GIF89a") return "image/gif";
  return null;
}

function signUpload(params: Record<string, string>, secret: string) {
  const canonical = Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return createHash("sha1").update(`${canonical}${secret}`).digest("hex");
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Requête non autorisée." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_SIZE) {
    return Response.json({ error: "La photo ne peut pas dépasser 8 Mo." }, { status: 413 });
  }

  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    return Response.json({ error: "Le stockage des photos n’est pas encore configuré. Contactez le responsable du site." }, { status: 503 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const kind = formData.get("kind");
  if (!(file instanceof File)) return Response.json({ error: "Choisissez une photo à envoyer." }, { status: 400 });
  if (!["events", "news", "projects", "gallery", "team", "sponsors"].includes(String(kind))) {
    return Response.json({ error: "Type de contenu invalide." }, { status: 400 });
  }
  const orgContent = kind === "gallery" || kind === "team" || kind === "sponsors";
  let user: Awaited<ReturnType<typeof requireAction>>;
  try {
    user = await requireAction(orgContent ? "org:manage" : "content:edit");
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return Response.json(
        { error: error.code === "UNAUTHENTICATED" ? "Session expirée. Reconnectez-vous." : "Accès refusé." },
        { status: error.code === "UNAUTHENTICATED" ? 401 : 403 },
      );
    }
    throw error;
  }
  const limit = await rateLimit(`image-upload:${user.id}`, 30, 60 * 60);
  if (!limit.ok) {
    return Response.json({ error: "Trop de photos envoyées. Réessayez dans une heure." }, { status: 429 });
  }
  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    return Response.json({ error: "La photo doit peser moins de 8 Mo." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detectedMime = getImageMime(bytes);
  if (!detectedMime || !MIME_TYPES.has(file.type) || file.type !== detectedMime) {
    return Response.json({ error: "Format refusé. Utilisez une image JPEG, PNG, WebP ou GIF." }, { status: 415 });
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const publicId = randomUUID();
  const signedParams = {
    folder: `ieee-isitcom/${kind}`,
    public_id: publicId,
    timestamp,
  };
  const uploadData = new FormData();
  uploadData.set("api_key", env.CLOUDINARY_API_KEY);
  uploadData.set("timestamp", timestamp);
  uploadData.set("folder", signedParams.folder);
  uploadData.set("public_id", publicId);
  uploadData.set("signature", signUpload(signedParams, env.CLOUDINARY_API_SECRET));
  uploadData.set("file", new Blob([bytes], { type: detectedMime }), file.name);

  let uploadResponse: Response;
  try {
    uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(env.CLOUDINARY_CLOUD_NAME)}/image/upload`,
      { method: "POST", body: uploadData, signal: AbortSignal.timeout(30_000) },
    );
  } catch (error) {
    console.error("Cloudinary image upload request failed.", error);
    return Response.json({ error: "Le service photo est temporairement indisponible. Réessayez plus tard." }, { status: 502 });
  }

  let uploadResult: unknown;
  try {
    uploadResult = await uploadResponse.json();
  } catch (error) {
    console.error("Cloudinary returned an unreadable image upload response.", error);
    return Response.json({ error: "Le service photo a renvoyé une réponse invalide." }, { status: 502 });
  }
  const expectedUrlPrefix = `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/`;
  if (!uploadResponse.ok || !uploadResult || typeof uploadResult !== "object" ||
      !("public_id" in uploadResult) || !("secure_url" in uploadResult) ||
      typeof uploadResult.public_id !== "string" || typeof uploadResult.secure_url !== "string" ||
      !uploadResult.secure_url.startsWith(expectedUrlPrefix)) {
    console.error(`Cloudinary image upload failed with status ${uploadResponse.status}.`);
    return Response.json({ error: "La photo n’a pas pu être envoyée. Réessayez plus tard." }, { status: 502 });
  }
  if (kind === "gallery") {
    await db.media.create({
      data: {
        kind: "IMAGE",
        publicId: uploadResult.public_id,
        url: uploadResult.secure_url,
        originalName: file.name.slice(0, 255),
        format: detectedMime.split("/")[1],
        bytes: file.size,
        folder: "ieee-isitcom/gallery",
        uploadedById: user.id,
      },
    });
  }

  return Response.json({
    publicId: uploadResult.public_id,
    secureUrl: uploadResult.secure_url,
  });
}
