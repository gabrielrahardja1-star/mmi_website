import Link from "next/link";
import { GalleryPhoto, JobRowItem, PressItem, StoryCard, VideoCard } from "./items";
import { NewsBrowser } from "./news-browser";
import { Bi, Ed, Empty, PhotoSlot } from "./primitives";
import type { SiteContent } from "@/lib/site-types";
import { mediaUrl } from "@/lib/media";
import { localizePath } from "@/lib/routes";
import type { ViewLang } from "@/lib/format";

type PageProps = { content: SiteContent; edit: boolean };

const slotSrc = (c: SiteContent["copy"], slot: "hero" | "team" | "about") => {
  const id = c.img(slot);
  return id ? mediaUrl(id) : undefined;
};

function Crumbs({ idLabel, enLabel, lang }: { idLabel: string; enLabel: string; lang: ViewLang }) {
  return (
    <div className="crumbs">
      <Link href={localizePath("/", lang)}>
        <Bi lang={lang} id="Beranda" en="Home" />
      </Link>{" "}
      / <Bi lang={lang} id={idLabel} en={enLabel} />
    </div>
  );
}

/* ================= Beranda ================= */
export function HomePage({ content, edit }: PageProps) {
  const c = content.copy;
  const lang = content.lang;
  const news = content.news; // already published only, newest first
  const homeVideo = content.videos.find((v) => v.home);
  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <Ed c={c} edit={edit} k="home-h1-1" as="h1" />
            <Ed c={c} edit={edit} k="home-p-1" as="p" />
            <div className="ctas">
              <Ed c={c} edit={edit} k="home-a-1" as="a" className="btn" href="/tentang" />
              <Ed c={c} edit={edit} k="home-a-2" as="a" className="btn ghost" href="/karir" />
            </div>
          </div>
          <figure>
            <PhotoSlot
              lang={lang}
              slot="hero"
              src={slotSrc(c, "hero")}
              edit={edit}
              className="hero-media ph cut"
              tagId="Foto utama"
              tagEn="Hero photo"
              hintId="Foto fasilitas atau kru tambang."
              hintEn="Mine facilities or crew photo."
            />
            <Ed c={c} edit={edit} k="home-figcaption-1" as="figcaption" />
          </figure>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="bento">
            <div className="b-main">
              <Ed c={c} edit={edit} k="home-h2-1" as="h2" />
              <Ed c={c} edit={edit} k="home-p-2" as="p" className="muted" />
              <div>
                <Ed c={c} edit={edit} k="home-a-3" as="a" className="link" href="/tentang" />
              </div>
            </div>
            <PhotoSlot
              lang={lang}
              slot="team"
              src={slotSrc(c, "team")}
              edit={edit}
              className="b-img ph"
              tagId="Foto tim (lebar)"
              tagEn="Team photo (wide)"
              hintId="Foto bersama kru dan staf."
              hintEn="Group photo of crew and staff."
            />
            <div className="b-tile">
              <span className="k">
                <Bi lang={lang} id="Metode tambang" en="Mining method" />
              </span>
              <span className="v">Longwall</span>
            </div>
            <div className="b-tile">
              <span className="k">
                <Bi lang={lang} id="Wilayah operasi" en="Operating area" />
              </span>
              <span className="v">
                <Bi lang={lang} id="Kalimantan Selatan" en="South Kalimantan" />
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="band-tint">
        <div className="wrap">
          <div className="head">
            <Ed c={c} edit={edit} k="home-h2-2" as="h2" />
            <Ed c={c} edit={edit} k="home-a-4" as="a" className="link" href="/media" />
          </div>
          <div className="lead-grid">
            {news.length ? (
              <>
                <div className="lead">
                  <StoryCard n={news[0]} edit={edit} lang={lang} />
                </div>
                <div className="side">
                  {news.slice(1, 3).map((n) => (
                    <StoryCard key={n.id} n={n} edit={edit} lang={lang} excerpt={false} />
                  ))}
                </div>
              </>
            ) : (
              <Empty lang={lang} id="Belum ada berita" en="No news yet" />
            )}
          </div>
        </div>
      </section>

      {/* Always present, hidden when no video is featured: the spacing rules between sections
          (band-tint + section, section + section) depend on it being there, as in the prototype. */}
      <section id="homeVideoSec" hidden={!homeVideo}>
        <div className="wrap" id="homeVideo">
          {homeVideo && <VideoCard v={homeVideo} big edit={edit} lang={lang} />}
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="band cut">
            <div>
              <Ed c={c} edit={edit} k="home-h2-3" as="h2" />
              <Ed c={c} edit={edit} k="home-p-3" as="p" />
            </div>
            <Ed c={c} edit={edit} k="home-a-5" as="a" className="btn light" href="/karir" />
          </div>
        </div>
      </section>
    </>
  );
}

/* ================= Tentang Kami ================= */
const draftBadge = (lang: ViewLang) => (
  <span className="draft">
    <Bi id="Draf" en="Draft" lang={lang} />
  </span>
);

export function AboutPage({ content, edit }: PageProps) {
  const c = content.copy;
  const lang = content.lang;
  const values: [string, string][] = [
    ["about-h3-1", "about-p-4"],
    ["about-h3-2", "about-p-5"],
    ["about-h3-3", "about-p-6"],
    ["about-h3-4", "about-p-7"],
  ];
  return (
    <>
      <div className="pagehead">
        <div className="wrap">
          <Crumbs idLabel="Tentang Kami" enLabel="About Us" lang={lang} />
          <Ed c={c} edit={edit} k="about-h1-1" as="h1" />
          <div className="subnav">
            <a href="#profil" data-jump="profil">
              <Bi lang={lang} id="Profil" en="Profile" />
            </a>
            <a href="#visi" data-jump="visi">
              <Bi lang={lang} id="Visi & Misi" en="Vision & Mission" />
            </a>
            <a href="#nilai" data-jump="nilai">
              <Bi lang={lang} id="Nilai Inti" en="Core Values" />
            </a>
          </div>
        </div>
      </div>

      <section id="profil">
        <div className="wrap split">
          <div className="prose">
            <Ed c={c} edit={edit} k="about-h2-1" as="h2" />
            <Ed c={c} edit={edit} k="about-p-1" as="p" />
            <Ed c={c} edit={edit} k="about-p-2" as="p" />
            <Ed c={c} edit={edit} k="about-p-3" as="p" className="todo" />
          </div>
          <PhotoSlot
              lang={lang}
            slot="about"
            src={slotSrc(c, "about")}
            edit={edit}
            className="ph cut about-photo"
            tagId="Foto operasi (4:3)"
            tagEn="Operations photo (4:3)"
            hintId="Fasilitas permukaan atau area kerja."
            hintEn="Surface facilities or work area."
          />
        </div>
      </section>

      <section id="visi" className="band-tint">
        <div className="wrap">
          <div className="head">
            <Ed c={c} edit={edit} k="about-h2-2" as="h2" extra={draftBadge(lang)} />
          </div>
          <div className="vision">
            <div>
              <span className="lbl">
                <Bi lang={lang} id="Visi" en="Vision" />
              </span>
              <Ed c={c} edit={edit} k="about-blockquote-1" as="blockquote" />
            </div>
            <div>
              <span className="lbl">
                <Bi lang={lang} id="Misi" en="Mission" />
              </span>
              <ul className="mission">
                {["about-li-1", "about-li-2", "about-li-3", "about-li-4"].map((k) => (
                  <Ed key={k} c={c} edit={edit} k={k} as="li" />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="nilai">
        <div className="wrap">
          <div className="head">
            <Ed c={c} edit={edit} k="about-h2-3" as="h2" extra={draftBadge(lang)} />
          </div>
          <div className="values">
            {values.map(([h, p]) => (
              <div key={h}>
                <Ed c={c} edit={edit} k={h} as="h3" />
                <Ed c={c} edit={edit} k={p} as="p" className="muted" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

/* ================= Media ================= */
export function MediaPage({ content, edit }: PageProps) {
  const c = content.copy;
  const lang = content.lang;
  const gallery = content.gallery.slice(0, 7); // the 7 latest visible photos
  const videos = content.videos;
  return (
    <>
      <div className="pagehead">
        <div className="wrap">
          <Crumbs idLabel="Media" enLabel="Media" lang={lang} />
          <h1>Media</h1>
          <Ed c={c} edit={edit} k="media-p-1" as="p" />
        </div>
      </div>

      <section>
        <div className="wrap">
          <NewsBrowser items={content.news} edit={edit} lang={lang} />
        </div>
      </section>

      <section className="band-tint">
        <div className="wrap">
          <div className="head">
            <Ed c={c} edit={edit} k="media-h2-1" as="h2" />
          </div>
          <div className="gallery" id="gallery">
            {gallery.length ? (
              gallery.map((g, i) => <GalleryPhoto key={g.id} g={g} wide={i === 3} edit={edit} lang={lang} />)
            ) : (
              <Empty lang={lang} id="Galeri masih kosong" en="The gallery is empty" />
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="head">
            <Ed c={c} edit={edit} k="media-h2-2" as="h2" />
          </div>
          <div className={`vids${videos.length === 1 ? " one" : ""}`} id="videoList">
            {videos.length ? (
              videos.map((v) => <VideoCard key={v.id} v={v} big={videos.length === 1} edit={edit} lang={lang} />)
            ) : (
              <Empty lang={lang} id="Belum ada video" en="No videos yet" />
            )}
          </div>
        </div>
      </section>
    </>
  );
}

/* ================= Artikel ================= */
export function ArticlesPage({ content, edit }: PageProps) {
  const c = content.copy;
  const lang = content.lang;
  return (
    <>
      <div className="pagehead">
        <div className="wrap">
          <Crumbs idLabel="Artikel" enLabel="Articles" lang={lang} />
          <Ed c={c} edit={edit} k="articles-h1-1" as="h1" />
          <Ed c={c} edit={edit} k="articles-p-1" as="p" />
        </div>
      </div>
      <section>
        <div className="wrap">
          <div className="press-list" id="pressList">
            {content.articles.length ? (
              content.articles.map((a) => <PressItem key={a.id} a={a} edit={edit} lang={lang} />)
            ) : (
              <Empty lang={lang} id="Belum ada artikel" en="No articles yet" />
            )}
          </div>
        </div>
      </section>
    </>
  );
}

/* ================= Karir ================= */
export function CareersPage({ content, edit }: PageProps) {
  const c = content.copy;
  const lang = content.lang;
  const steps: [string, string][] = [
    ["careers-h3-1", "careers-p-2"],
    ["careers-h3-2", "careers-p-3"],
    ["careers-h3-3", "careers-p-4"],
    ["careers-h3-4", "careers-p-5"],
  ];
  return (
    <>
      <div className="pagehead">
        <div className="wrap">
          <Crumbs idLabel="Karir" enLabel="Careers" lang={lang} />
          <Ed c={c} edit={edit} k="careers-h1-1" as="h1" />
          <Ed c={c} edit={edit} k="careers-p-1" as="p" />
        </div>
      </div>

      <section>
        <div className="wrap">
          <div className="head">
            <Ed c={c} edit={edit} k="careers-h2-1" as="h2" />
          </div>
          {content.jobs.length > 0 && (
            <div className="jobs-head" id="jobsHead">
              <span>
                <Bi lang={lang} id="Posisi" en="Position" />
              </span>
              <span>
                <Bi lang={lang} id="Lokasi" en="Location" />
              </span>
              <span>
                <Bi lang={lang} id="Status" en="Type" />
              </span>
              <span>JobStreet</span>
            </div>
          )}
          <div className="jobs" id="jobs">
            {content.jobs.length ? (
              content.jobs.map((j) => <JobRowItem key={j.id} j={j} edit={edit} lang={lang} />)
            ) : (
              <Empty lang={lang}
                id="Belum ada lowongan saat ini"
                en="No openings right now"
                subId="Pantau halaman JobStreet resmi kami untuk posisi baru."
                subEn="Check our official JobStreet page for new positions."
              />
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="head">
            <Ed c={c} edit={edit} k="careers-h2-2" as="h2" />
          </div>
          <div className="process">
            {steps.map(([h, p]) => (
              <div key={h}>
                <Ed c={c} edit={edit} k={h} as="h3" />
                <Ed c={c} edit={edit} k={p} as="p" className="muted" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="fraud" role="note">
            <Ed c={c} edit={edit} k="careers-h3-5" as="h3" />
            <Ed c={c} edit={edit} k="careers-p-6" as="p" />
          </div>
        </div>
      </section>
    </>
  );
}
