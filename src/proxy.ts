import { NextResponse, type NextRequest } from "next/server";
import { decide } from "@/lib/host-routing";
import { getEnv, isIndexable } from "@/lib/env";
import { LANG_COOKIE } from "@/lib/routes";

export function proxy(request: NextRequest) {
  const env = getEnv();
  const { pathname, search } = request.nextUrl;
  const decision = decide(
    request.headers.get("host"),
    pathname,
    search,
    { publicHost: env.PUBLIC_HOST, cmsHost: env.CMS_HOST, publicOrigin: env.PUBLIC_ORIGIN },
    request.cookies.get(LANG_COOKIE)?.value === "en",
  );

  let response: NextResponse;
  switch (decision.type) {
    case "redirect":
      return NextResponse.redirect(decision.url, decision.permanent ? 308 : 307);
    case "notFound":
      return new NextResponse("Not found", { status: 404 });
    case "rewrite": {
      // Rewriting relies on the server being started with HOSTNAME=0.0.0.0 (as in the Dockerfile). Started
      // with another hostname (e.g. 127.0.0.1) Next treats these rewrites as external and fetches them from
      // itself with the wrong Host header, so every page 404s. dev and `next start` hide this.
      const url = request.nextUrl.clone();
      url.pathname = decision.pathname;
      response = NextResponse.rewrite(url);
      break;
    }
    default:
      response = NextResponse.next();
  }

  // The editor is never indexed. The public site isn't either until SITE_INDEXABLE=true.
  const host = request.headers.get("host")?.toLowerCase();
  if (host === env.CMS_HOST.toLowerCase() || (host === env.PUBLIC_HOST.toLowerCase() && !isIndexable())) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export const config = {
  // /api/media is skipped so Next does not buffer (and silently cut at 10 MB) photo uploads.
  // That route checks the host and the login itself.
  matcher: "/((?!api/media).*)",
};
