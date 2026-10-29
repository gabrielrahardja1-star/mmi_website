import { getEnv } from "@/lib/env";

// Defence in depth: src/proxy.ts already hides /api/* from the public host, and every editor API
// route also checks the Host header itself, so a proxy mistake can't expose them.
export function isCmsHost(host: string | null): boolean {
  return (host ?? "").toLowerCase() === getEnv().CMS_HOST.toLowerCase();
}

export function notFound(): Response {
  return new Response("Not found", { status: 404 });
}

// Returns a 404 response when the request did not arrive on the editor host, else null.
export function cmsHostGuard(request: Request): Response | null {
  return isCmsHost(request.headers.get("host")) ? null : notFound();
}
