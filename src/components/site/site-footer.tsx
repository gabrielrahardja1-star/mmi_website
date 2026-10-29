import Link from "next/link";
import { Bi, Ed } from "./primitives";
import { PAGES, pagePath } from "@/lib/routes";
import type { Copy } from "@/lib/page-copy";

const FOOT_LINKS = PAGES.filter((p) => p.key !== "home");
const LABEL: Record<string, [string, string]> = {
  about: ["Tentang Kami", "About Us"],
  media: ["Media", "Media"],
  articles: ["Artikel", "Articles"],
  careers: ["Karir", "Careers"],
};

// Social links are placeholders until MMI supplies the real profile URLs (open item in CLAUDE.md §9).
const SOCIAL = ["LinkedIn", "Instagram", "YouTube"];

export function SiteFooter({ c, edit }: { c: Copy; edit: boolean }) {
  const lang = c.lang;
  return (
    <footer>
      <div className="wrap">
        <div className="fgrid">
          <div>
            <span className="flogo">
              <img src="/static/logo-mark.png" alt="" />
              <span>Merge Mining Industri</span>
            </span>
            <Ed c={c} edit={edit} k="foot-p-1" as="p" />
          </div>
          <div>
            <h4>
              <Bi lang={lang} id="Navigasi" en="Navigation" />
            </h4>
            {FOOT_LINKS.map((p) => (
              <Link key={p.key} href={pagePath(p.key, lang)}>
                <Bi lang={lang} id={LABEL[p.key][0]} en={LABEL[p.key][1]} />
              </Link>
            ))}
          </div>
          <div>
            <h4>
              <Bi lang={lang} id="Lokasi tambang" en="Mine site" />
            </h4>
            <p>
              Kecamatan Sungai Pinang,
              <br />
              <Bi lang={lang} id="Kalimantan Selatan, Indonesia" en="South Kalimantan, Indonesia" />
            </p>
          </div>
          <div>
            <h4>
              <Bi lang={lang} id="Hubungi kami" en="Contact" />
            </h4>
            <Ed c={c} edit={edit} k="foot-p-2" as="p" />
            {SOCIAL.map((name) => (
              <a key={name} href="#" aria-disabled="true">
                {name}
              </a>
            ))}
          </div>
        </div>
        <div className="legal">
          <span>
            © {new Date().getFullYear()} PT Merge Mining Industri. <Bi lang={lang} id="Hak cipta dilindungi." en="All rights reserved." />
          </span>
        </div>
      </div>
    </footer>
  );
}
