import { createContent, listContent } from "@/lib/content-service";
import { editorRoute, jsonError, readJson } from "@/lib/editor-api";
import { isContentType } from "@/lib/permissions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ type: string }> };

// GET /api/content/news  -> every row, drafts included (the editor's content lists)
export async function GET(request: Request, ctx: Ctx) {
  const { type } = await ctx.params;
  if (!isContentType(type)) return jsonError("Tidak ditemukan.", 404);
  return editorRoute(request, async () => Response.json({ items: await listContent(type) }));
}

// POST /api/content/news  { ...fields }  -> 201 with the created row
export async function POST(request: Request, ctx: Ctx) {
  const { type } = await ctx.params;
  if (!isContentType(type)) return jsonError("Tidak ditemukan.", 404);
  return editorRoute(
    request,
    async (user) => {
      const body = await readJson(request);
      if (body instanceof Response) return body;
      const result = await createContent(type, body, user);
      return result.ok ? Response.json(result.value, { status: 201 }) : jsonError(result.error, result.status, result.fields);
    },
    { write: true },
  );
}
