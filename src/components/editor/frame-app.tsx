"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ED_LABEL, IMG_LABEL, CONTENT_LABEL } from "./config";
import type { FrameState, Selection, ToFrame, ToParent } from "./protocol";
import { AboutPage, ArticlesPage, CareersPage, HomePage, MediaPage } from "@/components/site/pages";
import { SiteShell } from "@/components/site/site-shell";
import { toPublicContent } from "@/lib/public-view";
import { makeCopy } from "@/lib/page-copy";
import type { Lang } from "@/lib/format";
import { PAGES, type PageKey } from "@/lib/routes";
import type { ContentType } from "@/lib/permissions";

const VIEWS = { home: HomePage, about: AboutPage, media: MediaPage, articles: ArticlesPage, careers: CareersPage };

const pageOfHref = (href: string): PageKey | null => {
  const path = href.replace(/^\/en(?=\/|$)/, "") || "/";
  return PAGES.find((p) => p.path === path)?.key ?? null;
};

// The site as the editor shows it: the same components as the public pages, drawn from the shell's state.
// Clicks are intercepted here and reported to the shell; nothing in this document navigates.
export function FrameApp({ initial }: { initial: FrameState }) {
  const [state, setState] = useState<FrameState>(initial);
  const [epoch, setEpoch] = useState(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const inline = useRef<{ key: string; span: HTMLElement } | null>(null);
  const held = useRef<FrameState | null>(null); // state that arrived while a text edit was open
  const wantInline = useRef<string | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const lastSel = useRef<string>("");

  const send = (msg: ToParent) => window.parent.postMessage(msg, window.location.origin);

  // ----- state from the editor shell -----
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      const m = e.data as ToFrame;
      if (m?.type !== "state") return;
      if (inline.current) held.current = m.state;
      else setState(m.state);
    };
    window.addEventListener("message", onMessage);
    send({ type: "ready" });
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // ----- inline text editing -----
  const stopInline = () => {
    const cur = inline.current;
    if (!cur) return;
    cur.span.removeAttribute("contenteditable");
    inline.current = null;
    // The browser changed those text nodes behind React's back, so rebuild the tree from state.
    setEpoch((n) => n + 1);
    if (held.current) {
      setState(held.current);
      held.current = null;
    }
  };

  const startInline = (el: Element) => {
    stopInline();
    const span = el.querySelector<HTMLElement>(`:scope > .${stateRef.current.lang}`);
    if (!span) return;
    span.contentEditable = "plaintext-only";
    if (span.contentEditable !== "plaintext-only") span.contentEditable = "true";
    inline.current = { key: (el as HTMLElement).dataset.ed ?? "", span };
    span.focus();
    const range = document.createRange();
    range.selectNodeContents(span);
    range.collapse(false);
    const sel = getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  // A click on text asks the shell to select it; once the shell confirms (it may refuse while an item has
  // unsaved changes) the confirmed state arrives here and we open the text for typing.
  useEffect(() => {
    const want = wantInline.current;
    if (!want) return;
    wantInline.current = null;
    if (state.mode === "edit" && state.selection?.kind === "text" && state.selection.key === want) {
      const el = document.querySelector(`[data-ed="${CSS.escape(want)}"]`);
      if (el) startInline(el);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // ----- clicks, keys, hover -----
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const st = stateRef.current;
      const target = e.target as Element;
      if (!target.closest) return;
      // News filter tabs and the mobile menu button work as they do on the live site.
      if (target.closest(".tabs, .menu-btn")) return;

      const lang = target.closest(".lang button[data-lang-choice]") as HTMLElement | null;
      if (lang) {
        e.preventDefault();
        e.stopPropagation();
        send({ type: "lang", lang: lang.dataset.langChoice as Lang });
        return;
      }
      const a = target.closest("a") as HTMLAnchorElement | null;
      if (a?.dataset.jump) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById(a.dataset.jump)?.scrollIntoView({ block: "start" });
        return;
      }

      if (st.mode === "preview") {
        const href = a?.getAttribute("href") ?? "";
        if (a && href.startsWith("/") && a.target !== "_blank") {
          e.preventDefault();
          e.stopPropagation();
          const page = pageOfHref(href);
          if (page) send({ type: "navigate", page });
        }
        return;
      }

      if (inline.current?.span.contains(target)) return; // moving the caret inside the text being edited
      e.preventDefault();
      e.stopPropagation();
      const t = target.closest<HTMLElement>("[data-ed],[data-img],[data-col]");
      if (!t) {
        const page = a ? pageOfHref(a.getAttribute("href") ?? "") : null;
        if (page) send({ type: "navigate", page });
        else send({ type: "select", sel: null });
        return;
      }
      if (t.dataset.ed) {
        wantInline.current = t.dataset.ed;
        send({ type: "select", sel: { kind: "text", key: t.dataset.ed } });
      } else if (t.dataset.img) {
        send({ type: "select", sel: { kind: "img", key: t.dataset.img } });
      } else if (t.dataset.col && t.dataset.id) {
        send({ type: "select", sel: { kind: "item", col: t.dataset.col as ContentType, id: t.dataset.id } });
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (!inline.current) return;
      if (e.key === "Enter") {
        e.preventDefault();
        inline.current.span.blur();
      } else if (e.key === "Escape") inline.current.span.blur();
    };

    const onInput = (e: Event) => {
      const cur = inline.current;
      if (!cur || !cur.span.contains(e.target as Node)) return;
      const value = (cur.span.textContent ?? "").replace(/\s*\n\s*/g, " ");
      send({ type: "text", key: cur.key, lang: stateRef.current.lang, value });
    };

    const onFocusOut = (e: FocusEvent) => {
      const cur = inline.current;
      if (cur && e.target === cur.span) setTimeout(() => document.activeElement !== cur.span && stopInline(), 0);
    };

    const onDblClick = (e: MouseEvent) => {
      if (stateRef.current.mode === "edit" && (e.target as Element).closest?.("a")) e.preventDefault();
    };

    const tip = tipRef.current;
    const onOver = (e: MouseEvent) => {
      if (!tip) return;
      const st = stateRef.current;
      const t = st.mode === "edit" ? (e.target as Element).closest?.<HTMLElement>("[data-ed],[data-img],[data-col]") : null;
      if (!t) {
        tip.hidden = true;
        return;
      }
      const r = t.getBoundingClientRect();
      tip.textContent = t.dataset.ed
        ? ED_LABEL(t.dataset.ed)
        : t.dataset.img
          ? (IMG_LABEL[t.dataset.img] ?? "Foto")
          : `${CONTENT_LABEL[t.dataset.col as ContentType] ?? "Item"} · klik untuk edit`;
      tip.style.left = `${r.left + scrollX - 3}px`;
      tip.style.top = `${r.top + scrollY - 3}px`;
      tip.hidden = false;
    };
    const hideTip = () => tip && (tip.hidden = true);

    document.addEventListener("click", onClick, true);
    document.addEventListener("dblclick", onDblClick, true);
    document.addEventListener("keydown", onKey);
    document.addEventListener("input", onInput);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseleave", hideTip);
    window.addEventListener("scroll", hideTip, { passive: true });
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("dblclick", onDblClick, true);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("input", onInput);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseleave", hideTip);
      window.removeEventListener("scroll", hideTip);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- document-level state -----
  useEffect(() => {
    document.body.dataset.lang = state.lang;
    document.documentElement.lang = state.lang;
    document.body.classList.toggle("cv-on", state.mode === "edit");
    if (tipRef.current) tipRef.current.hidden = true;
  }, [state.lang, state.mode]);

  useEffect(() => {
    window.scrollTo(0, 0); // braces on purpose: some browsers return a Promise, which React rejects as a cleanup
  }, [state.page]);

  // Outline the selected element. Runs after every render, because a remount drops the class.
  useLayoutEffect(() => {
    document.querySelectorAll(".cv-sel").forEach((x) => x.classList.remove("cv-sel"));
    const s: Selection | null = state.selection;
    if (!s || state.mode !== "edit") return;
    const el =
      s.kind === "text"
        ? document.querySelector(`[data-ed="${CSS.escape(s.key)}"]`)
        : s.kind === "img"
          ? document.querySelector(`[data-img="${CSS.escape(s.key)}"]`)
          : s.id
            ? document.querySelector(`[data-col="${s.col}"][data-id="${CSS.escape(s.id)}"]`)
            : null;
    el?.classList.add("cv-sel");
    // Bring a newly picked item into view (not on every keystroke while editing it).
    const sig = JSON.stringify(s);
    if (el && s.kind === "item" && sig !== lastSel.current) el.scrollIntoView({ block: "center", behavior: "smooth" });
    lastSel.current = sig;
  });

  const content = useMemo(
    () => toPublicContent(state.content, makeCopy(state.copy, "both"), "both"),
    [state.content, state.copy],
  );
  const View = VIEWS[state.page];

  return (
    <>
      <div key={epoch}>
        <SiteShell current={state.page} copy={content.copy} edit={state.mode === "edit"} canvasLang={state.lang}>
          <View content={content} edit={state.mode === "edit"} />
        </SiteShell>
      </div>
      <div ref={tipRef} className="e-tip" hidden />
    </>
  );
}
