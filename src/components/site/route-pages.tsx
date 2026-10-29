import Link from "next/link";
import { AboutPage, ArticlesPage, CareersPage, HomePage, MediaPage } from "./pages";
import { Bi } from "./primitives";
import { SiteShell } from "./site-shell";
import { getPublicContent } from "@/lib/content";
import type { Lang } from "@/lib/format";
import { makeCopy } from "@/lib/page-copy";
import { pagePath, type PageKey } from "@/lib/routes";

const VIEWS = { home: HomePage, about: AboutPage, media: MediaPage, articles: ArticlesPage, careers: CareersPage };

// One page component per (page, language). The /tentang and /en/tentang route files both call this.
export function sitePage(key: PageKey, lang: Lang) {
  const View = VIEWS[key];
  return async function SitePage() {
    const content = await getPublicContent(lang);
    return (
      <SiteShell current={key} copy={content.copy}>
        <View content={content} edit={false} />
      </SiteShell>
    );
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
