import { FrameApp } from "@/components/editor/frame-app";
import type { FrameState } from "@/components/editor/protocol";
import { getEditorSnapshot } from "@/lib/content-service";
import { PAGES, type PageKey } from "@/lib/routes";
import { requireUser } from "@/lib/session";

// The canvas document. Loaded in an iframe by the editor shell. The server renders a first paint from the
// saved draft; after that the shell drives it with postMessage.
export default async function FramePage({ searchParams }: { searchParams: Promise<{ page?: string; lang?: string }> }) {
  await requireUser();
  const q = await searchParams;
  const page = (PAGES.find((p) => p.key === q.page)?.key ?? "home") as PageKey;
  const snap = await getEditorSnapshot();
  const initial: FrameState = {
    page,
    lang: q.lang === "en" ? "en" : "id",
    mode: "edit",
    content: snap.content,
    copy: snap.draft,
    selection: null,
  };
  return <FrameApp initial={initial} />;
}
