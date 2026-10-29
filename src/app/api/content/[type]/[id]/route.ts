import { deleteContent, updateContent } from "@/lib/content-service";
import { editorRoute, jsonError, readJson } from "@/lib/editor-api";
import { UUID_RE } from "@/lib/media-store";
import { isContentType } from "@/lib/permissions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ type: string; id: string }> };

// PUT /api/content/news/<id>  { ...fields }  -> the updated row. Replaces all editable fields.
export async function PUT(request: Request, ctx: Ctx) {
  const { type, id } = await ctx.params;
  if (!isContentType(type) || !UUID_RE.test(id)) return jsonError("Tidak ditemukan.", 404);
  return editorRoute(
    request,
    async (user) => {
      const body = await readJson(request);
      if (body instanceof Response) return body;
      const result = await updateContent(type, id, body, user);
      return result.ok ? Response.json(result.value) : jsonError(result.error, result.status, result.fields);
    },
    { write: true },
  );
}

export async function DELETE(request: Request, ctx: Ctx) {
  const { type, id } = await ctx.params;
  if (!isContentType(type) || !UUID_RE.test(id)) return jsonError("Tidak ditemukan.", 404);
  return editorRoute(
    request,
    async (user) => {
      const result = await deleteContent(type, id, user);
      return result.ok ? new Response(null, { status: 204 }) : jsonError(result.error, result.status);
    },
    { write: true },
  );
}
