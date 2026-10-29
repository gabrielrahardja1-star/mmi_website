import type { Lang } from "@/lib/format";
import type { CopyDoc } from "@/lib/page-copy";
import type { ContentType } from "@/lib/permissions";
import type { PageKey } from "@/lib/routes";
import type { RawContent } from "@/lib/site-types";

// What is selected in the editor: a piece of page text, a page photo slot, or a content item.
export type Selection =
  | { kind: "text"; key: string }
  | { kind: "img"; key: string }
  | { kind: "item"; col: ContentType; id: string | null };

// Everything the canvas needs to draw. The editor shell owns this state and sends the whole thing
// on every change; the canvas only draws it and reports clicks back.
export type FrameState = {
  page: PageKey;
  lang: Lang;
  mode: "edit" | "preview";
  content: RawContent;
  copy: CopyDoc;
  selection: Selection | null;
};

export type ToFrame = { type: "state"; state: FrameState };

export type ToParent =
  | { type: "ready" }
  | { type: "select"; sel: Selection | null }
  | { type: "text"; key: string; lang: Lang; value: string }
  | { type: "navigate"; page: PageKey }
  | { type: "lang"; lang: Lang };
