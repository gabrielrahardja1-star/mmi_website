import type { Metadata } from "next";
import { getEnv, isIndexable } from "@/lib/env";
import type { Lang } from "@/lib/format";
import { pagePath, type PageKey } from "@/lib/routes";

const SITE_NAME = "PT Merge Mining Industri";

const META: Record<Lang, Record<PageKey, { title: string; description: string }>> = {
  id: {
    home: {
      title: `${SITE_NAME} | Tambang batu bara bawah tanah`,
      description:
        "PT Merge Mining Industri mengelola tambang batu bara bawah tanah dengan metode longwall di Kecamatan Sungai Pinang, Kalimantan Selatan.",
    },
    about: {
      title: `Tentang Kami | ${SITE_NAME}`,
      description: "Profil, visi dan misi, serta nilai inti PT Merge Mining Industri.",
    },
    media: {
      title: `Media | ${SITE_NAME}`,
      description: "Berita, kegiatan, foto, dan video dari PT Merge Mining Industri.",
    },
    articles: {
      title: `Artikel | ${SITE_NAME}`,
      description: "Liputan tentang PT Merge Mining Industri dari media lain.",
    },
    careers: {
      title: `Karir | ${SITE_NAME}`,
      description: "Lowongan kerja di PT Merge Mining Industri. Semua lowongan dibuka melalui JobStreet.",
    },
  },
  en: {
    home: {
      title: `${SITE_NAME} | Underground coal mining`,
      description:
        "PT Merge Mining Industri runs an underground longwall coal mine in Sungai Pinang District, South Kalimantan.",
    },
    about: {
      title: `About Us | ${SITE_NAME}`,
      description: "Company profile, vision and mission, and core values of PT Merge Mining Industri.",
    },
    media: {
      title: `Media | ${SITE_NAME}`,
      description: "News, activities, photos and videos from PT Merge Mining Industri.",
    },
    articles: {
      title: `Articles | ${SITE_NAME}`,
      description: "Coverage of PT Merge Mining Industri from other publications.",
    },
    careers: {
      title: `Careers | ${SITE_NAME}`,
      description: "Job openings at PT Merge Mining Industri. All positions are posted on JobStreet.",
    },
  },
};

// Title, description, canonical and hreflang alternates for one page in one language.
// Indonesian is the x-default.
export function pageMetadata(key: PageKey, lang: Lang): Metadata {
  const m = META[lang][key];
  return {
    metadataBase: new URL(getEnv().PUBLIC_ORIGIN.replace(/\/$/, "")),
    title: m.title,
    description: m.description,
    alternates: {
      canonical: pagePath(key, lang),
      languages: { id: pagePath(key, "id"), en: pagePath(key, "en"), "x-default": pagePath(key, "id") },
    },
    openGraph: {
      title: m.title,
      description: m.description,
      url: pagePath(key, lang),
      siteName: SITE_NAME,
      type: "website",
      locale: lang === "id" ? "id_ID" : "en_US",
      alternateLocale: lang === "id" ? "en_US" : "id_ID",
    },
    icons: { icon: "/static/logo-mark.png" },
    // Hidden from search engines until SITE_INDEXABLE=true.
    robots: isIndexable() ? { index: true, follow: true } : { index: false, follow: false },
  };
}
