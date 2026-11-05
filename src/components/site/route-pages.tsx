import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { AboutPage, CareersPage, HomePage, MediaPage, StoryPage } from "./pages";
import { Bi } from "./primitives";
import { SiteShell } from "./site-shell";
import { SOCIAL } from "./site-footer";
import { getPublicContent, getPublicNews } from "@/lib/content";
import type { Lang } from "@/lib/format";
import { makeCopy } from "@/lib/page-copy";
import { newsPath, newsSlug, pagePath, type PageKey } from "@/lib/routes";
import { jsonLd, newsData, newsMetadata, organizationData } from "@/lib/site-metadata";

const VIEWS = { home: HomePage, about: AboutPage, media: MediaPage, careers: CareersPage };

// One page component per (page, language). The /tentang and /en/tentang route files both call this.
export function sitePage(key: PageKey, lang: Lang) {
  const View = VIEWS[key];
  return async function SitePage() {
    const content = await getPublicContent(lang);
    return (
      <SiteShell current={key} copy={content.copy}>
        {key === "home" && <StructuredData data={organizationData(SOCIAL.map(([, url]) => url))} />}
        <View content={content} edit={false} />
      </SiteShell>
    );
  };
}

function StructuredData({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />;
}

type StoryProps = { params: Promise<{ slug: string }> };
const storyOf = async ({ params }: StoryProps) => getPublicNews((await params).slug.slice(-8));

// One story's page. /berita/x and /en/berita/x both call this. An outdated title in the address redirects.
export function storyPage(lang: Lang) {
  return async function SiteStory(props: StoryProps) {
    const n = await storyOf(props);
    if (!n) notFound();
    if ((await props.params).slug !== newsSlug(n)) permanentRedirect(newsPath(n, lang));
    const content = await getPublicContent(lang);
    return (
      <SiteShell current="media" copy={content.copy} langPaths={{ id: newsPath(n, "id"), en: newsPath(n, "en") }}>
        <StructuredData data={newsData(n, lang)} />
        <StoryPage n={n} lang={lang} />
      </SiteShell>
    );
  };
}

export function storyMetadata(lang: Lang) {
  return async function generateMetadata(props: StoryProps) {
    const n = await storyOf(props);
    return n ? newsMetadata(n, lang) : {};
  };
}

// Uses the built-in default copy only, so the 404 still renders if the database is unreachable.
export function siteNotFound(lang: Lang) {
  return function SiteNotFound() {
    return (
      <SiteShell current="home" copy={makeCopy(null, lang)}>
        <div className="pagehead">
          <div className="wrap">
            <h1>404</h1>
            <p>
              <Bi lang={lang} id="Halaman yang Anda cari tidak ditemukan." en="The page you are looking for was not found." />
            </p>
            <p>
              <Link className="link" href={pagePath("home", lang)}>
                <Bi lang={lang} id="Kembali ke beranda" en="Back to home" />
              </Link>
            </p>
          </div>
        </div>
      </SiteShell>
    );
  };
}
