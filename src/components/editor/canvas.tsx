"use client";

import { useEffect, useRef } from "react";
import type { ToFrame, ToParent } from "./protocol";
import type { Editor } from "./use-editor";

// The site in an iframe. The shell owns all state and posts it down; the iframe posts clicks and typing
// back. Same origin, so postMessage is checked against both the origin and the iframe's own window.
export function Canvas({ e }: { e: Editor }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);
  const latest = useRef(e);
  latest.current = e;
  // Fixed at first render: the canvas switches page and language by message, never by reloading.
  const src = useRef(`/frame?page=${e.page}&lang=${e.lang}`).current;

  const post = () => {
    const win = frame.current?.contentWindow;
    if (win && ready.current) win.postMessage({ type: "state", state: latest.current.frameState } satisfies ToFrame, window.location.origin);
  };

  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin || ev.source !== frame.current?.contentWindow) return;
      const m = ev.data as ToParent;
      if (m?.type === "ready") {
        ready.current = true;
        post();
        return;
      }
      latest.current.onFrameMessage(m);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(post, [e.frameState]);

  return (
    <div className="e-canvas" id="eCanvas">
      <div className={`e-frame${e.mobile ? " cv-mobile" : ""}`} id="eFrame">
        <iframe ref={frame} title="Pratinjau situs" src={src} />
      </div>
    </div>
  );
}
