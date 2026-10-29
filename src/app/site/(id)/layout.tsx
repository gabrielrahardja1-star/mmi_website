import type { ReactNode } from "react";
import { SiteRoot } from "@/components/site/site-root";

// Pages read the database on every request, so a published change shows up without a deploy.
export const dynamic = "force-dynamic";

// Root layout for the id half of the public site. The editor has its own root layout in app/cms.
export default function Layout({ children }: { children: ReactNode }) {
  return <SiteRoot lang="id">{children}</SiteRoot>;
}
