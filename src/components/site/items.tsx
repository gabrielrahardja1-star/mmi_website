import Link from "next/link";
import { Bi, colAttrs } from "./primitives";
import { CATS, fmtDate, type CatKey, type ViewLang } from "@/lib/format";
import { localizePath } from "@/lib/routes";
import { mediaUrl } from "@/lib/media";
import type { ArticleItem, GalleryItem, JobItem, NewsItem, VideoItem } from "@/lib/site-types";

export function StoryCard({
  n,
  edit,
  lang,
  excerpt = true,
}: {
  n: NewsItem;
  edit: boolean;
  lang: ViewLang;
  excerpt?: boolean;
}) {
  const [catId, catEn] = CATS[n.cat as CatKey] ?? ["", ""];
  return (
    <Link className="story" href={localizePath("/media", lang)} {...colAttrs(edit, "news", n.id)}>
      {n.coverImageId ? (
        <div className="photo">
          <img src={mediaUrl(n.coverImageId, 800)} alt="" loading="lazy" />
        </div>
      ) : (
        <div className="ph">
          <span className="tag">
            <Bi lang={lang} id="Foto" en="Photo" />
          </span>
        </div>
      )}
      <div className="txt">
        <div className="meta">
          <span className="cat">
            <Bi lang={lang} id={catId} en={catEn} />
          </span>
          <span>
            <Bi lang={lang} id={fmtDate(n.date, "id")} en={fmtDate(n.date, "en")} />
          </span>
        </div>
        <h3>
          <Bi lang={lang} id={n.titleId} en={n.titleEn} />
        </h3>
        {excerpt && (
          <p>
            <Bi lang={lang} id={n.summaryId} en={n.summaryEn} />
          </p>
        )}
      </div>
    </Link>
  );
}

// External press coverage: headline, outlet, date and our own one-line summary. Opens the publisher.
export function PressItem({ a, edit, lang }: { a: ArticleItem; edit: boolean; lang: ViewLang }) {
  return (
    <a className="pitem" href={a.url} target="_blank" rel="noopener" {...colAttrs(edit, "articles", a.id)}>
      <div className="src">
        <b>{a.source}</b>
        <span>
          {a.date ? (
            <Bi lang={lang} id={fmtDate(a.date, "id")} en={fmtDate(a.date, "en")} />
          ) : (
            <Bi lang={lang} id="Tanggal belum diisi" en="No date" />
          )}
        </span>
      </div>
      <div className="txt">
        <h3>{a.title}</h3>
        <p>
          <Bi lang={lang} id={a.summaryId} en={a.summaryEn} />
        </p>
      </div>
      <span className="ext">
        <Bi lang={lang} id="Baca artikel" en="Read article" /> ↗
      </span>
    </a>
  );
}

export function JobRowItem({ j, edit, lang }: { j: JobItem; edit: boolean; lang: ViewLang }) {
  return (
    <div className="job" {...colAttrs(edit, "jobs", j.id)}>
      <h3>
        <Bi lang={lang} id={j.titleId} en={j.titleEn} />
      </h3>
      <span className="loc">{j.location}</span>
      <span className="type">
        <Bi lang={lang} id={j.typeId} en={j.typeEn} />
      </span>
      <a href={j.url} target="_blank" rel="noopener">
        <Bi lang={lang} id="Lamar di JobStreet" en="Apply on JobStreet" /> ↗
      </a>
    </div>
  );
}

export function VideoCard({ v, big, edit, lang }: { v: VideoItem; big: boolean; edit: boolean; lang: ViewLang }) {
  return (
    <a className="vid" href={v.url} target="_blank" rel="noopener" {...colAttrs(edit, "videos", v.id)}>
      <div className="ph" style={big ? undefined : { aspectRatio: "16/9" }}>
        <span className="play" aria-hidden="true" />
        <span className="tag">
          <b>YouTube</b>
          <Bi lang={lang} id="Buka di YouTube" en="Opens on YouTube" />
        </span>
      </div>
      <h3>
        <Bi lang={lang} id={v.titleId} en={v.titleEn} />
      </h3>
    </a>
  );
}

// The caption doubles as alt text. In the editor (lang "both") alt uses the Indonesian caption, since
// an attribute can't hold the id/en span pair.
export function GalleryPhoto({ g, wide, edit, lang }: { g: GalleryItem; wide: boolean; edit: boolean; lang: ViewLang }) {
  return (
    <figure className={`photo${wide ? " wide" : ""}`} style={{ margin: 0 }} {...colAttrs(edit, "gallery", g.id)}>
      <img src={mediaUrl(g.imageId, 800)} alt={lang === "en" ? g.captionEn || g.captionId : g.captionId} loading="lazy" />
    </figure>
  );
}
