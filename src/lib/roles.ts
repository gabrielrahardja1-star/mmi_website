// Editor roles (CLAUDE.md section 6). Kept free of server imports so the editor UI can use it too.
//   admin        users and everything else
//   editor       all content and publishing
//   contributor  creates and edits drafts only, cannot publish
export const ROLES = ["admin", "editor", "contributor"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  editor: "Editor",
  contributor: "Kontributor",
};

export const isRole = (v: unknown): v is Role => typeof v === "string" && (ROLES as readonly string[]).includes(v);

// An unknown or missing role gets the least access.
export const asRole = (v: unknown): Role => (isRole(v) ? v : "contributor");

export const canPublish = (role: Role) => role === "admin" || role === "editor";
export const canManageUsers = (role: Role) => role === "admin";
