import type { ViewLang } from "@/lib/format";
import type { Copy } from "@/lib/page-copy";

// The fields the site components read. Plain data, so the same components render rows loaded from the
// database (public pages) and the editor's in-memory copies (canvas), where dates arrive as strings.
export type NewsItem = {
  id: string;
  cat: string;
  date: string;
  titleId: string;
  titleEn: string;
  summaryId: string;
  summaryEn: string;
  coverImageId: string | null;
  status: string;
};
export type ArticleItem = {
  id: string;
  source: string;
  url: string;
  date: string | null;
  title: string;
  summaryId: string;
  summaryEn: string;
  status: string;
};
export type GalleryItem = {
  id: string;
  imageId: string;
  captionId: string;
  captionEn: string;
  date: string;
  status: string;
};
export type VideoItem = {
  id: string;
  url: string;
  titleId: string;
  titleEn: string;
  date: string;
  home: boolean;
  status: string;
};
export type JobItem = {
  id: string;
  titleId: string;
  titleEn: string;
  location: string;
  typeId: string;
  typeEn: string;
  url: string;
  sortOrder: number;
  status: string;
};

export type RawContent = {
  news: NewsItem[];
  articles: ArticleItem[];
  gallery: GalleryItem[];
  videos: VideoItem[];
  jobs: JobItem[];
};

export type SiteContent = RawContent & { lang: ViewLang; copy: Copy };
