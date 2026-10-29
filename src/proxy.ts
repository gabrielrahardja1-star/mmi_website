import { NextResponse, type NextRequest } from "next/server";
import { decide } from "@/lib/host-routing";
import { getEnv } from "@/lib/env";
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
      const url = request.nextUrl.clone();
      url.pathname = decision.pathname;
      response = NextResponse.rewrite(url);
      break;
    }
    default:
      response = NextResponse.next();
  }

  // The editor must never be indexed.
  if (request.headers.get("host")?.toLowerCase() === env.CMS_HOST.toLowerCase()) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export const config = {
  // /api/media is skipped so Next does not buffer (and silently cut at 10 MB) photo uploads.
  // That route checks the host and the login itself.
  matcher: "/((?!api/media).*)",
};
