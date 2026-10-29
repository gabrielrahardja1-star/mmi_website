import { saveDraft } from "@/lib/content-service";
import { editorRoute, jsonError, readJson } from "@/lib/editor-api";

export const dynamic = "force-dynamic";

// PUT /api/page-copy/draft  { text: {key: {id, en}}, img: {hero?, team?, about?} }
// Autosave target. Any signed-in role may edit the draft; visitors only see it after publish.
export async function PUT(request: Request) {
  return editorRoute(
    request,
    async (user) => {
      const body = await readJson(request);
      if (body instanceof Response) return body;
      const result = await saveDraft(body, user);
      return result.ok ? Response.json(result.value) : jsonError(result.error, result.status, result.fields);
    },
    { write: true },
  );
}
