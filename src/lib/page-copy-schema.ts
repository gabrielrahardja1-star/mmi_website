import { z } from "zod";
import { LIMITS } from "@/lib/content-schemas";
import { DEFAULT_TEXT, PHOTO_SLOTS, makeCopy, type CopyDoc } from "@/lib/page-copy";

// Page text is edited inline as a single line, so line breaks are folded into spaces.
const line = z
  .string()
  .max(LIMITS.pageText, `Teks maksimal ${LIMITS.pageText} karakter.`)
  .transform((s) => s.replace(/\s*\n\s*/g, " "));

const slot = z.preprocess((v) => (v === "" ? null : v), z.uuid("Foto tidak valid.").nullable().optional());

// The draft document the editor autosaves. Only keys that exist in data/page-copy-defaults.json are
// accepted, so a typo or a made-up key can't be stored.
export const pageCopyInput = z.strictObject({
  text: z.record(z.string(), z.strictObject({ id: line, en: line })).refine(
    (t) => Object.keys(t).every((k) => k in DEFAULT_TEXT),
    "Ada kunci teks yang tidak dikenal.",
  ),
  img: z.strictObject(Object.fromEntries(PHOTO_SLOTS.map((s) => [s, slot]))).partial(),
});

export type PageCopyInput = z.infer<typeof pageCopyInput>;

// True when the draft would change what visitors see. Compares the effective text of every key and
// every photo slot, so a key reset to its default (removed from the draft) counts as "same".
export function copyDiffers(a: Partial<CopyDoc> | null | undefined, b: Partial<CopyDoc> | null | undefined): boolean {
  const ca = makeCopy(a);
  const cb = makeCopy(b);
  for (const key of Object.keys(DEFAULT_TEXT)) {
    const x = ca.text(key);
    const y = cb.text(key);
    if (x.id !== y.id || (x.en || x.id) !== (y.en || y.id)) return true;
  }
  return PHOTO_SLOTS.some((s) => (ca.img(s) ?? null) !== (cb.img(s) ?? null));
}
