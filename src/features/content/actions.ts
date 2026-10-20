"use server";

import { ContentStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ForbiddenError, requireAction } from "@/features/auth/session";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { parseTunisDateTime } from "@/features/content/dates";

const kindSchema = z.enum(["events", "news", "projects"]);
const commonSchema = z.object({
  id: z.string().optional(),
  kind: kindSchema,
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Utilisez un slug en minuscules séparé par des tirets."),
  titleFr: z.string().trim().min(1).max(240),
  titleEn: z.string().trim().max(240).optional(),
  summaryFr: z.string().trim().max(1000).optional(),
  summaryEn: z.string().trim().max(1000).optional(),
  descriptionFr: z.string().max(50000).optional(),
  descriptionEn: z.string().max(50000).optional(),
  coverImage: z.string().trim().max(255).optional(),
  status: z.nativeEnum(ContentStatus),
  publishedAt: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  locationName: z.string().trim().max(255).optional(),
  mode: z.enum(["IN_PERSON", "ONLINE", "HYBRID"]).optional(),
  stage: z.enum(["IDEA", "IN_PROGRESS", "COMPLETED"]).optional(),
  techTags: z.string().max(1000).optional(),
});

type ActionResult = { error: string } | { redirectTo: string };

function optional(value: string | undefined) {
  const result = value?.trim();
  return result ? result : undefined;
}

function localized(fr: string, en?: string): Prisma.InputJsonObject {
  return { fr, ...(optional(en) ? { en: optional(en) } : {}) };
}

function readForm(formData: FormData) {
  return commonSchema.safeParse({
    id: formData.get("id") || undefined,
    kind: formData.get("kind"),
    slug: formData.get("slug"),
    titleFr: formData.get("titleFr"),
    titleEn: formData.get("titleEn") || undefined,
    summaryFr: formData.get("summaryFr") || undefined,
    summaryEn: formData.get("summaryEn") || undefined,
    descriptionFr: formData.get("descriptionFr") || undefined,
    descriptionEn: formData.get("descriptionEn") || undefined,
    coverImage: formData.get("coverImage") || undefined,
    status: formData.get("status") ?? "DRAFT",
    publishedAt: formData.get("publishedAt") || undefined,
    startsAt: formData.get("startsAt") || undefined,
    endsAt: formData.get("endsAt") || undefined,
    locationName: formData.get("locationName") || undefined,
    mode: formData.get("mode") || undefined,
    stage: formData.get("stage") || undefined,
    techTags: formData.get("techTags") || undefined,
  });
}

export async function saveContent(formData: FormData): Promise<ActionResult> {
  const parsed = readForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Vérifiez les champs du formulaire." };

  const data = parsed.data;
  let user;
  try {
    user = await requireAction("content:edit");
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "Votre session n’est plus autorisée. Reconnectez-vous ou contactez un administrateur." };
    throw error;
  }
  if (user.role === "EDITOR" && data.status !== "DRAFT" && data.status !== "IN_REVIEW") {
    return { error: "Les éditeurs peuvent uniquement enregistrer un brouillon ou le soumettre à révision." };
  }

  const title = localized(data.titleFr, data.titleEn);
  const summary = data.summaryFr || data.summaryEn
    ? localized(data.summaryFr ?? "", data.summaryEn)
    : undefined;
  const description = data.descriptionFr || data.descriptionEn
    ? localized(data.descriptionFr ?? "", data.descriptionEn)
    : undefined;
  const publishAt = parseTunisDateTime(data.publishedAt);
  if (data.publishedAt && !publishAt) return { error: "Date de publication invalide." };

  try {
    let entityId: string;
    let created = false;
    let oldStatus: ContentStatus | undefined;

    if (data.kind === "events") {
      const startsAt = parseTunisDateTime(data.startsAt);
      const endsAt = parseTunisDateTime(data.endsAt);
      if (!startsAt) return { error: "La date de début de l’événement est obligatoire." };
      if (data.endsAt && !endsAt) return { error: "La date de fin est invalide." };
      if (endsAt && endsAt < startsAt) return { error: "La date de fin doit suivre la date de début." };
      const previous = data.id ? await db.event.findUnique({ where: { id: data.id }, select: { status: true } }) : null;
      if (data.id && !previous) return { error: "Cet événement n’existe plus." };
      if (user.role === "EDITOR" && previous?.status === "PUBLISHED") return { error: "Un éditeur ne peut pas modifier un événement publié." };
      oldStatus = previous?.status;
      const values = {
        slug: data.slug,
        title,
        summary: summary ?? Prisma.DbNull,
        description: description ?? Prisma.DbNull,
        coverImage: optional(data.coverImage),
        startsAt,
        endsAt: endsAt ?? null,
        locationName: optional(data.locationName),
        mode: data.mode ?? "IN_PERSON" as const,
        status: data.status,
        publishedAt: data.status === "PUBLISHED" ? publishAt ?? new Date() : publishAt ?? null,
        searchText: [data.titleFr, data.summaryFr, data.descriptionFr].filter(Boolean).join(" "),
      };
      const record = data.id
        ? await db.event.update({ where: { id: data.id }, data: values })
        : await db.event.create({ data: values });
      entityId = record.id;
      created = !data.id;
    } else if (data.kind === "news") {
      const previous = data.id ? await db.post.findUnique({ where: { id: data.id }, select: { status: true } }) : null;
      if (data.id && !previous) return { error: "Cette actualité n’existe plus." };
      if (user.role === "EDITOR" && previous?.status === "PUBLISHED") return { error: "Un éditeur ne peut pas modifier une actualité publiée." };
      oldStatus = previous?.status;
      const record = data.id
        ? await db.post.update({
            where: { id: data.id },
            data: {
              slug: data.slug,
              title,
              excerpt: summary ?? Prisma.DbNull,
              content: description ?? localized(data.titleFr),
              coverImage: optional(data.coverImage),
              status: data.status,
              publishedAt: data.status === "PUBLISHED" ? publishAt ?? new Date() : publishAt ?? null,
              searchText: [data.titleFr, data.summaryFr, data.descriptionFr].filter(Boolean).join(" "),
            },
          })
        : await db.post.create({
            data: {
              slug: data.slug,
              title,
              excerpt: summary,
              content: description ?? localized(data.titleFr),
              coverImage: optional(data.coverImage),
              status: data.status,
              publishedAt: data.status === "PUBLISHED" ? publishAt ?? new Date() : publishAt ?? null,
              authorId: user.id,
              searchText: [data.titleFr, data.summaryFr, data.descriptionFr].filter(Boolean).join(" "),
            },
          });
      entityId = record.id;
      created = !data.id;
    } else {
      const previous = data.id ? await db.project.findUnique({ where: { id: data.id }, select: { status: true } }) : null;
      if (data.id && !previous) return { error: "Ce projet n’existe plus." };
      if (user.role === "EDITOR" && previous?.status === "PUBLISHED") return { error: "Un éditeur ne peut pas modifier un projet publié." };
      oldStatus = previous?.status;
      const record = data.id
        ? await db.project.update({
            where: { id: data.id },
            data: {
              slug: data.slug,
              title,
              summary: summary ?? Prisma.DbNull,
              description: description ?? Prisma.DbNull,
              coverImage: optional(data.coverImage),
              stage: data.stage ?? "IN_PROGRESS",
              techTags: data.techTags?.split(",").map((tag) => tag.trim()).filter(Boolean) ?? [],
              status: data.status,
              publishedAt: data.status === "PUBLISHED" ? publishAt ?? new Date() : publishAt ?? null,
              searchText: [data.titleFr, data.summaryFr, data.descriptionFr].filter(Boolean).join(" "),
            },
          })
        : await db.project.create({
            data: {
              slug: data.slug,
              title,
              summary: summary ?? Prisma.DbNull,
              description: description ?? Prisma.DbNull,
              coverImage: optional(data.coverImage),
              stage: data.stage ?? "IN_PROGRESS",
              techTags: data.techTags?.split(",").map((tag) => tag.trim()).filter(Boolean) ?? [],
              status: data.status,
              publishedAt: data.status === "PUBLISHED" ? publishAt ?? new Date() : publishAt ?? null,
              searchText: [data.titleFr, data.summaryFr, data.descriptionFr].filter(Boolean).join(" "),
            },
          });
      entityId = record.id;
      created = !data.id;
    }

    const action = created
      ? "CREATE"
      : oldStatus !== data.status && data.status === "PUBLISHED"
        ? "PUBLISH"
        : oldStatus === "PUBLISHED" && data.status !== "PUBLISHED"
          ? "UNPUBLISH"
          : "UPDATE";
    await audit({
      action,
      userId: user.id,
      userEmail: user.email,
      entityType: data.kind,
      entityId,
      summary: `${created ? "Création" : "Modification"} : ${data.titleFr}`,
    });
    revalidatePath("/admin");
    revalidatePath(`/admin/content/${data.kind}`);
    revalidatePath(`/admin/content/${data.kind}/${entityId}`);
    if (data.kind === "events") {
      revalidatePath("/events");
      revalidatePath("/en/events");
    }
    return { redirectTo: `/admin/content/${data.kind}` };
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "Vous n’avez pas l’autorisation d’effectuer cette action." };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Ce slug est déjà utilisé. Choisissez-en un autre." };
    }
    throw error;
  }
}

export async function deleteContent(formData: FormData): Promise<ActionResult> {
  const parsed = z.object({ id: z.string().min(1), kind: kindSchema }).safeParse({
    id: formData.get("id"),
    kind: formData.get("kind"),
  });
  if (!parsed.success) return { error: "Élément invalide." };
  try {
    const user = await requireAction("content:delete");
    const { id, kind } = parsed.data;
    if (kind === "events") {
      const registrations = await db.eventRegistration.count({ where: { eventId: id } });
      if (registrations > 0) return { error: "Impossible de supprimer un événement ayant des inscriptions. Archivez-le à la place." };
      await db.event.delete({ where: { id } });
    } else if (kind === "news") {
      await db.post.delete({ where: { id } });
    } else {
      await db.project.delete({ where: { id } });
    }
    await audit({ action: "DELETE", userId: user.id, userEmail: user.email, entityType: kind, entityId: id });
    revalidatePath("/admin");
    revalidatePath(`/admin/content/${kind}`);
    if (kind === "events") {
      revalidatePath("/events");
      revalidatePath("/en/events");
    }
    return { redirectTo: `/admin/content/${kind}` };
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "Vous n’avez pas l’autorisation d’effectuer cette action." };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { error: "Cet élément n’existe plus." };
    }
    throw error;
  }
}

export type ContentFormValues = {
  id?: string;
  kind: "events" | "news" | "projects";
  slug: string;
  title: Record<string, string>;
  summary: Record<string, string>;
  description: Record<string, string>;
  coverImage: string;
  status: ContentStatus;
  publishedAt: string;
  startsAt: string;
  endsAt: string;
  locationName: string;
  mode: string;
  stage: string;
  techTags: string;
};
