import defaults from "../../data/page-copy-defaults.json";
import type { PageCopyImg, PageCopyText } from "@/db/schema";
import type { ViewLang } from "@/lib/format";

export type CopyDoc = { text: PageCopyText; img: PageCopyImg };
export type PhotoSlot = "hero" | "team" | "about";

export const DEFAULT_TEXT = defaults.text as PageCopyText;
export const PHOTO_SLOTS: PhotoSlot[] = ["hero", "team", "about"];

export type Copy = {
  lang: ViewLang;
  text(key: string): { id: string; en: string };
  img(slot: PhotoSlot): string | undefined;
};

// A key missing from the stored copy falls back to the default, so a half-filled draft still renders.
export function makeCopy(doc?: Partial<CopyDoc> | null, lang: ViewLang = "both"): Copy {
  const text = doc?.text ?? {};
  const img = doc?.img ?? {};
  return {
    lang,
    text: (key) => text[key] ?? DEFAULT_TEXT[key] ?? { id: "", en: "" },
    img: (slot) => img[slot] || undefined,
  };
}
