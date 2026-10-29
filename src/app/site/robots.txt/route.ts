import { getEnv, isIndexable } from "@/lib/env";

export const dynamic = "force-dynamic";

// A route handler, not app/robots.ts: Next only supports that metadata file at the root of app/.
// Until SITE_INDEXABLE=true the whole site is closed to crawlers.
export function GET() {
  const origin = getEnv().PUBLIC_ORIGIN.replace(/\/$/, "");
  const body = isIndexable()
    ? `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`
    : "User-agent: *\nDisallow: /\n";
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
