import { getPageCopy } from "@/lib/content-service";
import { editorRoute } from "@/lib/editor-api";

export const dynamic = "force-dynamic";

// GET /api/page-copy -> { draft, live, unpublished }
export async function GET(request: Request) {
  return editorRoute(request, async () => Response.json(await getPageCopy()));
}
