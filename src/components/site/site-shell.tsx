import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import type { Copy } from "@/lib/page-copy";
import type { PageKey } from "@/lib/routes";

// Header, page body and footer. Used by the public routes and, with edit=true, by the editor canvas.
export function SiteShell({
  current,
  copy,
  edit = false,
  children,
}: {
  current: PageKey;
  copy: Copy;
  edit?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader current={current} lang={copy.lang} />
      <main>
        <div className="view">{children}</div>
      </main>
      <SiteFooter c={copy} edit={edit} />
    </>
  );
}
