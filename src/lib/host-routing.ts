// Decides what to do with a request based on its Host header. One container serves both the public
// site and the editor; this is the only place that keeps them apart. src/proxy.ts applies the result.
//
//   public host  -> app/site/*   (read-only website)
//   cms host     -> app/cms/*    (editor), plus /api/*
//   anything else-> 404, except /api/health (Docker healthcheck and `curl 127.0.0.1`)

export type HostConfig = {
  publicHost: string;
  cmsHost: string;
  publicOrigin: string;
};

export type Decision =
  | { type: "pass" }
  | { type: "rewrite"; pathname: string }
  | { type: "redirect"; url: string; permanent: boolean }
  | { type: "notFound" };

// Served the same on both hosts: build assets, uploaded photos, static files, health check.
const SHARED_PREFIXES = ["/_next/", "/media/", "/static/"];
const SHARED_EXACT = ["/favicon.ico", "/api/health"];

const isShared = (p: string) =>
  SHARED_EXACT.includes(p) || SHARED_PREFIXES.some((prefix) => p.startsWith(prefix));

const under = (p: string, base: string) => p === base || p.startsWith(base + "/");
const origin = (cfg: HostConfig) => cfg.publicOrigin.replace(/\/$/, "");
// Files for crawlers are never redirected by language.
const DISCOVERY = ["/sitemap.xml", "/robots.txt"];

export function decide(
  rawHost: string | null,
  pathname: string,
  search: string,
  cfg: HostConfig,
  prefersEn = false,
): Decision {
  const host = (rawHost ?? "").toLowerCase();

  if (isShared(pathname)) return { type: "pass" };

  if (host === `www.${cfg.publicHost.toLowerCase()}`) {
    return { type: "redirect", url: origin(cfg) + pathname + search, permanent: true };
  }

  if (host === cfg.publicHost.toLowerCase()) {
    // The public site has no API and no editor. Anything aimed at them hits the site's 404.
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return { type: "rewrite", pathname: "/site/404" };
    }
    // Returning English readers (cookie set by the language toggle) get the English URL. Temporary
    // redirect, and crawlers send no cookie, so they still index both languages.
    if (prefersEn && !under(pathname, "/en") && !DISCOVERY.includes(pathname)) {
      return {
        type: "redirect",
        url: origin(cfg) + (pathname === "/" ? "/en" : "/en" + pathname) + search,
        permanent: false,
      };
    }
    return { type: "rewrite", pathname: "/site" + (pathname === "/" ? "" : pathname) };
  }

  if (host === cfg.cmsHost.toLowerCase()) {
    if (under(pathname, "/api")) return { type: "pass" };
    return { type: "rewrite", pathname: "/cms" + (pathname === "/" ? "" : pathname) };
  }

  return { type: "notFound" };
}
