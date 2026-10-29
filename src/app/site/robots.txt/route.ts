import { getEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

// A route handler, not app/robots.ts: Next only supports that metadata file at the root of app/.
export function GET() {
  const origin = getEnv().PUBLIC_ORIGIN.replace(/\/$/, "");
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
