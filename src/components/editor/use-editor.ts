"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CONFIG, LIVE_OFF, LIVE_ON, PAGE_OF, TYPES, pickEditable, type Item } from "./config";
import type { FrameState, Selection, ToParent } from "./protocol";
import type { Lang } from "@/lib/format";
import { ApiError, api } from "@/lib/editor-client";
import { DEFAULT_TEXT, type CopyDoc } from "@/lib/page-copy";
import { copyDiffers } from "@/lib/page-copy-schema";
import type { ContentType } from "@/lib/permissions";
import { canPublish, type Role } from "@/lib/roles";
import type { PageKey } from "@/lib/routes";
import type { RawContent } from "@/lib/site-types";

export type Mode = "edit" | "preview";
export type Fly = null | "add" | "pages" | "content" | "media";
export type Items = Record<ContentType, Item[]>;
export type SaveState = "idle" | "saving" | "error";

// One content item open in the inspector.
export type ItemEdit = {
  type: ContentType;
  id: string | null; // null while it is new and unsaved
  data: Item;
  dirty: boolean;
  errors: Record<string, string>;
  confirmDel: boolean;
  pending: boolean; // asked to leave with unsaved changes: show the Tetap di sini / Buang warning
  saving: boolean;
  readOnly: boolean; // contributors can't change items that are already live
};

export type EditorInit = {
  user: { name: string; email: string; role: Role };
  items: Items;
  draft: CopyDoc;
  live: CopyDoc;
  publicOrigin: string;
};

const MAX_BYTES = 20 * 1024 * 1024;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export function useEditor(init: EditorInit) {
  const role = init.user.role;
  const [items, setItems] = useState<Items>(init.items);
  const [draft, setDraft] = useState<CopyDoc>(init.draft);
  const [live, setLive] = useState<CopyDoc>(init.live);
  const [page, setPageState] = useState<PageKey>("home");
  const [lang, setLang] = useState<Lang>("id");
  const [mode, setModeState] = useState<Mode>("edit");
  const [mobile, setMobile] = useState(false);
  const [fly, setFly] = useState<Fly>(null);
  const [flyCol, setFlyCol] = useState<ContentType | null>(null);
  const [flyQ, setFlyQ] = useState("");
  const [sel, setSel] = useState<Selection | null>(null); // text or img; items live in `ed`
  const [ed, setEd] = useState<ItemEdit | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [uploading, setUploading] = useState(0);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const [publishing, setPublishing] = useState(false);

  // Latest values for code that runs later (timers, message handlers).
  const R = useRef({ items, draft, live, page, mode, ed, sel, lang });
  R.current = { items, draft, live, page, mode, ed, sel, lang };

  const showToast = useCallback((text: string, bad?: boolean) => {
    setToast({ text, bad });
    clearTimeout((showToast as unknown as { t?: ReturnType<typeof setTimeout> }).t);
    (showToast as unknown as { t?: ReturnType<typeof setTimeout> }).t = setTimeout(() => setToast(null), 2600);
  }, []);

  const unpublished = copyDiffers(draft, live);
  const mayPublish = canPublish(role);

  // ---------- navigation and the unsaved-changes guard ----------

  // True when it is fine to move away from what is open. If the open item has unsaved changes, shows the
  // warning in the inspector instead and returns false.
  const canSwitch = useCallback((): boolean => {
    const cur = R.current.ed;
    if (cur?.dirty) {
      setEd((e) => (e ? { ...e, pending: true } : e));
      showToast("Simpan atau buang perubahan dulu.", true);
      return false;
    }
    return true;
  }, [showToast]);

  const setPage = useCallback((p: PageKey) => setPageState(p), []);

  const openItem = useCallback(
    (type: ContentType, id: string | null) => {
      const src = id ? R.current.items[type].find((x) => x.id === id) : undefined;
      if (id && !src) return;
      const data: Item = id ? pickEditable(type, clone(src as Item)) : CONFIG[type].blank(role);
      setEd({
        type,
        id,
        data,
        dirty: false,
        errors: {},
        confirmDel: false,
        pending: false,
        saving: false,
        readOnly: role === "contributor" && !!src && CONFIG[type].live(src),
      });
      setSel(null);
      const here = R.current.page;
      const onHome = here === "home" && (type === "news" || type === "videos");
      if (PAGE_OF[type] !== here && !onHome) setPageState(PAGE_OF[type]);
      setFly(null);
    },
    [role],
  );

  const select = useCallback(
    (next: Selection | null) => {
      if (!canSwitch()) return;
      if (next?.kind === "item") return openItem(next.col, next.id);
      setEd(null);
      setSel(next);
    },
    [canSwitch, openItem],
  );

  const changePage = useCallback(
    (p: PageKey) => {
      if (!canSwitch()) return false;
      setEd(null);
      setSel(null);
      setPageState(p);
      return true;
    },
    [canSwitch],
  );

  const setMode = useCallback(
    (m: Mode) => {
      if (m === "preview" && !canSwitch()) return;
      if (m === "preview") {
        setEd(null);
        setSel(null);
      }
      setModeState(m);
    },
    [canSwitch],
  );

  // ---------- page text and photos: autosaved draft, published with Terbitkan ----------

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const chain = useRef<Promise<unknown>>(Promise.resolve());

  const saveDraftNow = useCallback(() => {
    clearTimeout(timer.current);
    chain.current = chain.current
      .then(() => api.saveDraft(R.current.draft))
      .then(() => setSaveState("idle"))
      .catch((err: ApiError) => {
        setSaveState("error");
        showToast(err.message || "Gagal menyimpan draf.", true);
      });
    return chain.current;
  }, [showToast]);

  const queueDraft = useCallback(() => {
    setSaveState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(saveDraftNow, 700);
  }, [saveDraftNow]);

  const setText = useCallback(
    (key: string, l: Lang, value: string) => {
      setDraft((d) => {
        const cur = d.text[key] ?? { ...DEFAULT_TEXT[key] };
        return { ...d, text: { ...d.text, [key]: { ...cur, [l]: value } } };
      });
      queueDraft();
    },
    [queueDraft],
  );

  const resetText = useCallback(
    (key: string) => {
      setDraft((d) => {
        const text = { ...d.text };
        delete text[key];
        return { ...d, text };
      });
      queueDraft();
    },
    [queueDraft],
  );

  const setSlotImage = useCallback(
    (slot: string, id: string | null) => {
      setDraft((d) => {
        const img = { ...d.img } as Record<string, string>;
        if (id) img[slot] = id;
        else delete img[slot];
        return { ...d, img };
      });
      queueDraft();
    },
    [queueDraft],
  );

  const publish = useCallback(async () => {
    if (!mayPublish || publishing) return;
    setPublishing(true);
    try {
      await saveDraftNow(); // make sure the very latest typing is saved first
      await api.publish();
      setLive(clone(R.current.draft));
      showToast("Situs diterbitkan. Perubahan sudah tampil untuk pengunjung.");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Gagal menerbitkan. Coba lagi.", true);
    }
    setPublishing(false);
  }, [mayPublish, publishing, saveDraftNow, showToast]);

  // ---------- photos ----------

  const uploadOne = useCallback(
    async (file: File): Promise<string | null> => {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
        showToast("Pilih file JPG, PNG atau WEBP.", true);
        return null;
      }
      if (file.size > MAX_BYTES) {
        showToast(`${file.name} lebih dari 20 MB.`, true);
        return null;
      }
      setUploading((n) => n + 1);
      try {
        return (await api.upload(file)).id;
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : `Gagal mengunggah ${file.name}.`, true);
        return null;
      } finally {
        setUploading((n) => Math.max(0, n - 1));
      }
    },
    [showToast],
  );

  // Photo for a page slot (hero, team, about).
  const uploadSlot = useCallback(
    async (slot: string, file: File) => {
      const id = await uploadOne(file);
      if (id) setSlotImage(slot, id);
    },
    [uploadOne, setSlotImage],
  );

  // Photo for the item being edited (news cover, gallery photo).
  const uploadField = useCallback(
    async (field: string, file: File) => {
      const id = await uploadOne(file);
      if (id) setEd((e) => (e ? { ...e, data: { ...e.data, [field]: id }, dirty: true, errors: { ...e.errors, [field]: "" } } : e));
    },
    [uploadOne],
  );

  // Drag and drop / pick several photos straight into the gallery.
  const uploadToGallery = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      let ok = 0;
      for (const f of files) {
        const id = await uploadOne(f);
        if (!id) continue;
        try {
          const row = await api.create("gallery", { ...CONFIG.gallery.blank(role), imageId: id });
          setItems((it) => ({ ...it, gallery: [row, ...it.gallery] }));
          ok++;
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : `Gagal menyimpan ${f.name}.`, true);
        }
      }
      if (ok) {
        showToast(`${ok} foto masuk ke galeri${role === "contributor" ? " (disembunyikan sampai Editor menampilkannya)" : ""}.`);
        if (R.current.page !== "media") setPageState("media");
      }
    },
    [uploadOne, role, showToast],
  );

  // ---------- content items ----------

  const editField = useCallback((k: string, value: unknown) => {
    setEd((e) => {
      if (!e) return e;
      const data = { ...e.data, [k]: value };
      if (k === "typeId") data.typeEn = { "Penuh waktu": "Full-time", Kontrak: "Contract", Magang: "Internship" }[String(value)] ?? value;
      const errors = { ...e.errors };
      delete errors[k];
      return { ...e, data, dirty: true, errors };
    });
  }, []);

  const setLiveFlag = useCallback((on: boolean) => {
    setEd((e) => (e ? { ...e, data: { ...e.data, status: on ? LIVE_ON[e.type] : LIVE_OFF[e.type] }, dirty: true } : e));
  }, []);

  const saveItem = useCallback(
    async (status?: "live" | "draft") => {
      const cur = R.current.ed;
      if (!cur || cur.saving || cur.readOnly) return;
      const data = pickEditable(cur.type, cur.data);
      if (status) data.status = status === "live" ? LIVE_ON[cur.type] : LIVE_OFF[cur.type];
      setEd({ ...cur, data: { ...cur.data, ...(status ? { status: data.status } : {}) }, saving: true });
      try {
        const row = cur.id ? await api.update(cur.type, cur.id, data) : await api.create(cur.type, data);
        setItems((it) => {
          const list = it[cur.type];
          const next = cur.id ? list.map((x) => (x.id === row.id ? row : x)) : [row, ...list];
          // The server may have un-featured another video (only one can be the home video).
          return { ...it, [cur.type]: cur.type === "videos" && row.home ? next.map((x) => (x.id === row.id ? x : { ...x, home: false })) : next };
        });
        setEd({ ...cur, id: row.id, data: pickEditable(cur.type, row), dirty: false, errors: {}, pending: false, saving: false });
        const isLive = CONFIG[cur.type].live(row);
        showToast(
          status === "live" ? "Diterbitkan. Sudah tampil di situs." : status === "draft" ? "Disimpan sebagai draf." : isLive ? "Disimpan dan tampil di situs." : "Disimpan. Tidak tampil di situs.",
        );
      } catch (err) {
        const fields = err instanceof ApiError ? err.fields : undefined;
        setEd({ ...cur, saving: false, errors: fields ?? cur.errors });
        showToast(fields ? "Periksa kolom yang ditandai." : err instanceof ApiError ? err.message : "Gagal menyimpan. Coba lagi.", true);
      }
    },
    [showToast],
  );

  const deleteItem = useCallback(async () => {
    const cur = R.current.ed;
    if (!cur?.id || cur.saving) return;
    setEd({ ...cur, saving: true });
    try {
      await api.remove(cur.type, cur.id);
      setItems((it) => ({ ...it, [cur.type]: it[cur.type].filter((x) => x.id !== cur.id) }));
      setEd(null);
      showToast("Dihapus dari situs.");
    } catch (err) {
      setEd({ ...cur, saving: false });
      showToast(err instanceof ApiError ? err.message : "Gagal menghapus.", true);
    }
  }, [showToast]);

  const patchEd = useCallback((patch: Partial<ItemEdit>) => setEd((e) => (e ? { ...e, ...patch } : e)), []);
  const discard = useCallback(() => {
    setEd(null);
    setSel(null);
  }, []);

  // ---------- the canvas ----------

  const frameState: FrameState = useMemo(() => {
    let content = items as unknown as RawContent;
    // Show the item being edited as it is typed, before it is saved.
    if (ed?.id) content = { ...content, [ed.type]: items[ed.type].map((x) => (x.id === ed.id ? { ...x, ...ed.data } : x)) } as unknown as RawContent;
    const selection: Selection | null = ed ? { kind: "item", col: ed.type, id: ed.id } : sel;
    return { page, lang, mode, content, copy: draft, selection };
  }, [items, ed, sel, page, lang, mode, draft]);

  const onFrameMessage = useCallback(
    (m: ToParent) => {
      switch (m.type) {
        case "select":
          return select(m.sel);
        case "text":
          return setText(m.key, m.lang, m.value);
        case "navigate":
          return void changePage(m.page);
        case "lang":
          return setLang(m.lang);
      }
    },
    [select, setText, changePage],
  );

  // Warn before closing the tab with an unsaved item.
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (R.current.ed?.dirty || saveState === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [saveState]);

  return {
    user: init.user,
    role,
    publicOrigin: init.publicOrigin,
    items,
    draft,
    live,
    page,
    lang,
    mode,
    mobile,
    fly,
    flyCol,
    flyQ,
    sel,
    ed,
    saveState,
    uploading,
    toast,
    publishing,
    unpublished,
    mayPublish,
    frameState,
    types: TYPES,
    // actions
    setLang,
    setMobile,
    setFly,
    setFlyCol,
    setFlyQ,
    setPage,
    changePage,
    select,
    openItem,
    setMode,
    canSwitch,
    setText,
    resetText,
    setSlotImage,
    publish,
    uploadSlot,
    uploadField,
    uploadToGallery,
    editField,
    setLiveFlag,
    saveItem,
    deleteItem,
    patchEd,
    discard,
    showToast,
    onFrameMessage,
  };
}

export type Editor = ReturnType<typeof useEditor>;
