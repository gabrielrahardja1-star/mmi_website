import Link from "next/link";
import type { ElementType, ReactNode } from "react";
import type { ViewLang } from "@/lib/format";
import { localizePath } from "@/lib/routes";
import type { Copy } from "@/lib/page-copy";

// A translated string. Public pages render one language only, so each URL has a single language
// for search engines. The editor canvas passes lang="both": it renders a pair of spans and CSS
// shows one based on <body data-lang>, so switching language needs no reload. An empty English
// text shows the Indonesian one.
export function Bi({ id, en, lang }: { id: string; en?: string | null; lang: ViewLang }) {
  if (lang === "id") return <>{id}</>;
  if (lang === "en") return <>{en || id}</>;
  return (
    <>
      <span className="id">{id}</span>
      <span className="en">{en || id}</span>
    </>
  );
}

// Editor hooks. Only rendered inside the editor canvas: the public site never carries data-ed,
// data-img, data-col or data-id, so it has no edit surface.
export const colAttrs = (edit: boolean, col: string, id: string) =>
  edit ? { "data-col": col, "data-id": id } : {};

type EdProps = {
  c: Copy;
  edit: boolean;
  k: string;
  as?: ElementType;
  className?: string;
  href?: string;
  // Fixed content rendered after the editable text, e.g. the "Draf" badge in a heading.
  extra?: ReactNode;
};

// A block of editable page text. `k` is the key in page_copy (see data/page-copy-defaults.json).
export function Ed({ c, edit, k, as: Tag = "span", className, href, extra }: EdProps) {
  const t = c.text(k);
  const body = (
    <>
      <Bi id={t.id} en={t.en} lang={c.lang} />
      {extra}
    </>
  );
  const attrs = edit ? { "data-ed": k } : {};
  if (Tag === "a" && href?.startsWith("/")) {
    return (
      <Link href={localizePath(href, c.lang)} className={className} {...attrs}>
        {body}
      </Link>
    );
  }
  return (
    <Tag className={className} href={Tag === "a" ? href : undefined} {...attrs}>
      {body}
    </Tag>
  );
}

export function Empty({
  id,
  en,
  subId,
  subEn,
  lang,
}: {
  id: string;
  en: string;
  subId?: string;
  subEn?: string;
  lang: ViewLang;
}) {
  return (
    <div className="empty">
      <b>
        <Bi id={id} en={en} lang={lang} />
      </b>
      {subId && (
        <span>
          <Bi id={subId} en={subEn} lang={lang} />
        </span>
      )}
    </div>
  );
}

// A photo slot (hero, team, about). With a photo it fills the frame; without one it shows the
// brief for the photographer, as in the prototype.
export function PhotoSlot({
  slot,
  src,
  edit,
  lang,
  className,
  tagId,
  tagEn,
  hintId,
  hintEn,
}: {
  slot: string;
  src?: string;
  edit: boolean;
  lang: ViewLang;
  className: string;
  tagId: string;
  tagEn: string;
  hintId: string;
  hintEn: string;
}) {
  return (
    <div className={`${className}${src ? " has-img" : ""}`} {...(edit ? { "data-img": slot } : {})}>
      {src && <img src={src} alt="" />}
      <span className="tag">
        <b>
          <Bi id={tagId} en={tagEn} lang={lang} />
        </b>
        <Bi id={hintId} en={hintEn} lang={lang} />
      </span>
    </div>
  );
}
