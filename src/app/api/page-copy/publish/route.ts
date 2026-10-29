import { publishDraft } from "@/lib/content-service";
import { editorRoute, jsonError } from "@/lib/editor-api";
import { canPublish } from "@/lib/roles";

export const dynamic = "force-dynamic";

// POST /api/page-copy/publish -> copies the draft to live ("Terbitkan"). Editors and admins only.
export async function POST(request: Request) {
  return editorRoute(
    request,
    async (user) => {
      const result = await publishDraft(user);
      return result.ok ? Response.json(result.value) : jsonError(result.error, result.status);
    },
    { write: true, allow: canPublish },
  );
}
