import type { Role } from "@prisma/client";

/**
 * Login permissions and role rules. Mirrors the matrix in docs/ARCHITECTURE.md.
 * Used by: admin nav (hide links), pages (guard), server actions (enforce).
 */
export type Action =
  | "content:edit" // create/edit drafts: events, news, projects, albums, resources
  | "content:submit" // send a draft for review
  | "content:publish" // publish / unpublish / schedule / archive
  | "content:delete"
  | "org:manage" // team, chapters, sponsors, milestones, page content
  | "inbox:manage" // registrations, applications, messages, subscribers (+ export, email)
  | "checkin" // QR scanner
  | "settings:manage"
  | "users:manage"
  | "audit:view";

const EDITOR: Action[] = ["content:edit", "content:submit", "checkin"];
const ADMIN: Action[] = [
  ...EDITOR,
  "content:publish",
  "content:delete",
  "org:manage",
  "inbox:manage",
  "settings:manage",
];
const SUPER_ADMIN: Action[] = [...ADMIN, "users:manage", "audit:view"];

const MATRIX: Record<Role, ReadonlySet<Action>> = {
  EDITOR: new Set(EDITOR),
  ADMIN: new Set(ADMIN),
  SUPER_ADMIN: new Set(SUPER_ADMIN),
};

export function can(role: Role | null | undefined, action: Action): boolean {
  return !!role && MATRIX[role].has(action);
}

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super admin",
  ADMIN: "Admin",
  EDITOR: "Éditeur",
};
