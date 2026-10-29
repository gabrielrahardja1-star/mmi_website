"use client";

import { Canvas } from "./canvas";
import { Inspector } from "./inspector";
import { Flyout, Rail } from "./rail";
import { Toast } from "./toast";
import { TopBar } from "./top-bar";
import { useEditor, type EditorInit } from "./use-editor";

// The visual editor: top bar, left tools, the site in the middle, the inspector on the right.
export function EditorApp(init: EditorInit) {
  const e = useEditor(init);
  return (
    <div id="cms">
      <TopBar e={e} />
      <div className="e-work">
        <Rail e={e} />
        <Flyout e={e} />
        <Canvas e={e} />
        <Inspector e={e} />
      </div>
      <Toast toast={e.toast} />
    </div>
  );
}
