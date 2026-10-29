import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import type { Lang } from "@/lib/format";
import type { Copy } from "@/lib/page-copy";
import type { PageKey } from "@/lib/routes";

// Header, page body and footer. Used by the public routes and, with edit=true, by the editor canvas.
export function SiteShell({
  current,
  copy,
  edit = false,
  canvasLang,
  children,
}: {
  current: PageKey;
  copy: Copy;
  edit?: boolean;
  canvasLang?: Lang; // editor canvas only: which language the header toggle shows as active
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader current={current} lang={copy.lang} activeLang={canvasLang} />
      <main>
        <div className="view">{children}</div>
      </main>
      <SiteFooter c={copy} edit={edit} />
    </>
  );
}
