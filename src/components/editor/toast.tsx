"use client";

export type ToastMsg = { text: string; bad?: boolean } | null;

export function Toast({ toast }: { toast: ToastMsg }) {
  return (
    <div className={`c-toast${toast?.bad ? " bad" : ""}`} role="status" aria-live="polite" hidden={!toast}>
      {toast?.text}
    </div>
  );
}
