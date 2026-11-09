import type { Metadata } from "next";
import { getEnv, isIndexable } from "@/lib/env";
import type { Lang } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { newsPath, pagePath, type PageKey } from "@/lib/routes";
import type { NewsItem } from "@/lib/site-types";

const SITE_NAME = "PT Merge Mining Industri";
const SHARE_IMAGE = "/static/logo-mark.png";

const META: Record<Lang, Record<PageKey, { title: string; description: string }>> = {
  id: {
    home: {
      title: `${SITE_NAME} (MergeCoal) | Tambang batu bara bawah tanah`,
      description:
        "PT Merge Mining Industri (MergeCoal) mengelola tambang batu bara bawah tanah dengan metode longwall di Kecamatan Sungai Pinang, Kalimantan Selatan.",
    },
    about: {
      title: `Tentang Kami | ${SITE_NAME}`,
      description: "Profil, visi dan misi, serta nilai inti PT Merge Mining Industri.",
    },
    media: {
      title: `Media | ${SITE_NAME}`,
      description: "Berita, kegiatan, foto, dan video dari PT Merge Mining Industri.",
    },
    careers: {
      title: `Karir | ${SITE_NAME}`,
      description: "Lowongan kerja di PT Merge Mining Industri. Semua lowongan dibuka melalui JobStreet.",
    },
  },
  en: {
    home: {
      title: `${SITE_NAME} (MergeCoal) | Underground coal mining`,
      description:
        "PT Merge Mining Industri (MergeCoal) runs an underground longwall coal mine in Sungai Pinang District, South Kalimantan.",
    },
    about: {
      title: `About Us | ${SITE_NAME}`,
      description: "Company profile, vision and mission, and core values of PT Merge Mining Industri.",
    },
    media: {
      title: `Media | ${SITE_NAME}`,
      description: "News, activities, photos and videos from PT Merge Mining Industri.",
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
      images: [SHARE_IMAGE],
    },
    icons: { icon: "/static/logo-mark.png" },
    // Hidden from search engines until SITE_INDEXABLE=true.
    robots: isIndexable() ? { index: true, follow: true } : { index: false, follow: false },
  };
}

type Story = Pick<NewsItem, "id" | "date" | "titleId" | "titleEn" | "summaryId" | "summaryEn" | "coverImageId">;

const storyText = (n: Story, lang: Lang) => ({
  title: lang === "en" ? n.titleEn || n.titleId : n.titleId,
  description: lang === "en" ? n.summaryEn || n.summaryId : n.summaryId,
});

// Same as pageMetadata, for one story's page.
export function newsMetadata(n: Story, lang: Lang): Metadata {
  const { title, description } = storyText(n, lang);
  return {
    metadataBase: new URL(getEnv().PUBLIC_ORIGIN.replace(/\/$/, "")),
    title: `${title} | ${SITE_NAME}`,
    description,
    alternates: {
      canonical: newsPath(n, lang),
      languages: { id: newsPath(n, "id"), en: newsPath(n, "en"), "x-default": newsPath(n, "id") },
    },
    openGraph: {
      title,
      description,
      url: newsPath(n, lang),
      siteName: SITE_NAME,
      type: "article",
      publishedTime: n.date,
      locale: lang === "id" ? "id_ID" : "en_US",
      images: [n.coverImageId ? mediaUrl(n.coverImageId) : SHARE_IMAGE],
    },
    icons: { icon: "/static/logo-mark.png" },
    robots: isIndexable() ? { index: true, follow: true } : { index: false, follow: false },
  };
}

// Structured data for search engines. The < is escaped so text can't close the script tag.
export const jsonLd = (data: object) => JSON.stringify({ "@context": "https://schema.org", ...data }).replace(/</g, "\\u003c");

const originOf = () => getEnv().PUBLIC_ORIGIN.replace(/\/$/, "");

export const organizationData = (sameAs: string[]) => ({
  "@type": "Organization",
  name: SITE_NAME,
  alternateName: ["MergeCoal", "MMI"],
  url: originOf(),
  logo: originOf() + SHARE_IMAGE,
  sameAs,
});

export function newsData(n: Story, lang: Lang) {
  const { title, description } = storyText(n, lang);
  return {
    "@type": "NewsArticle",
    headline: title,
    description,
    datePublished: n.date,
    inLanguage: lang,
    mainEntityOfPage: originOf() + newsPath(n, lang),
    image: [originOf() + (n.coverImageId ? mediaUrl(n.coverImageId) : SHARE_IMAGE)],
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: originOf() + SHARE_IMAGE } },
  };
}
