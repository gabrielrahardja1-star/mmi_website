import { EditorApp } from "@/components/editor/editor-app";
import type { Items } from "@/components/editor/use-editor";
import { getEditorSnapshot } from "@/lib/content-service";
import { getEnv } from "@/lib/env";
import { requireUser } from "@/lib/session";

export const metadata = { title: "MMI Editor" };

export default async function EditorPage() {
  const user = await requireUser();
  const snap = await getEditorSnapshot();
  // Rows go to the browser as plain data. Dates become strings, which the editor never reads.
  const items = JSON.parse(JSON.stringify(snap.content)) as Items;
  return (
    <EditorApp
      user={{ name: user.name, email: user.email, role: user.role }}
      items={items}
      draft={snap.draft}
      live={snap.live}
      publicOrigin={getEnv().PUBLIC_ORIGIN}
    />
  );
}
