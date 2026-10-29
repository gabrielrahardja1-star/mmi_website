export const dynamic = "force-dynamic";

// The editor must never be indexed.
export function GET() {
  return new Response("User-agent: *\nDisallow: /\n", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
