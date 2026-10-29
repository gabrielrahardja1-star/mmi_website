export type Lang = "id" | "en";
// "both" renders the id and en spans side by side. Only the editor canvas uses it, so it can
// switch language without reloading. Public pages render exactly one language.
export type ViewLang = Lang | "both";

export const CATS = {
  com: ["Masyarakat", "Community"],
  env: ["Lingkungan", "Environment"],
  safe: ["Keselamatan", "Safety"],
  event: ["Kegiatan", "Company"],
} as const;
export type CatKey = keyof typeof CATS;

const MONTHS: Record<Lang, string[]> = {
  id: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

// "2026-10-17" -> "17 Okt 2026". Pure string maths, so no timezone can shift the day.
export function fmtDate(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[lang][m - 1]} ${y}`;
}

export const byDateDesc = <T extends { date: string | null }>(a: T, b: T) =>
  (b.date ?? "").localeCompare(a.date ?? "");

export const TYPE_EN: Record<string, string> = {
  "Penuh waktu": "Full-time",
  Kontrak: "Contract",
  Magang: "Internship",
};
