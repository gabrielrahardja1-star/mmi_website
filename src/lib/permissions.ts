import type { Role } from "@/lib/roles";

export const CONTENT_TYPES = ["news", "articles", "gallery", "videos", "jobs"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];
export const isContentType = (v: string): v is ContentType => (CONTENT_TYPES as readonly string[]).includes(v);

// The status value that makes a row visible to visitors. News and articles are published with their
// own Publish button; gallery, videos and jobs go live as soon as they are saved with this status.
const LIVE_STATUS: Record<ContentType, string> = {
  news: "pub",
  articles: "pub",
  gallery: "show",
  videos: "show",
  jobs: "open",
};
export const liveStatusOf = (type: ContentType) => LIVE_STATUS[type];
export const isLive = (type: ContentType, status: string | null | undefined) => status === LIVE_STATUS[type];

export type WriteVerdict = { ok: true } | { ok: false; message: string };
const NO: WriteVerdict = { ok: false, message: "Kontributor hanya boleh mengubah draf. Minta Editor untuk menerbitkan." };

// What a role may do to one row. `existing` is the row's current status (null when creating) and
// `next` the status being saved (null when deleting). Contributors can only touch rows that are not
// live and can only leave them not live; editors and admins can do anything.
export function checkWrite(role: Role, type: ContentType, existing: string | null, next: string | null): WriteVerdict {
  if (role !== "contributor") return { ok: true };
  if (existing !== null && isLive(type, existing)) return NO;
  if (next !== null && isLive(type, next)) return NO;
  return { ok: true };
}
