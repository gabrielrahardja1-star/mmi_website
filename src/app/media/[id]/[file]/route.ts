import { readFile } from "node:fs/promises";
import { MEDIA_FILE_NAMES, UUID_RE, uploadRoot } from "@/lib/media-store";
import { join } from "node:path";

export const dynamic = "force-dynamic";

// Serves /media/<uuid>/<400|800|1800>.webp for both the public site and the editor. The id is a UUID
// and the file name is checked against a fixed list, so nothing outside the uploads folder is reachable.
export async function GET(_request: Request, ctx: { params: Promise<{ id: string; file: string }> }) {
  const { id, file } = await ctx.params;
  if (!UUID_RE.test(id) || !MEDIA_FILE_NAMES.includes(file)) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(join(uploadRoot(), id, file));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/webp",
        // Ids are never reused, so the bytes behind a URL never change.
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
