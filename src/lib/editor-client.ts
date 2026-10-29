"use client";

import type { CopyDoc } from "@/lib/page-copy";
import type { ContentType } from "@/lib/permissions";

// Thin wrapper over the editor API (src/app/api/content, page-copy, media). Throws ApiError with the
// server's Indonesian message and any per-field errors, so the inspector can show them inline.
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

async function request<T>(method: string, url: string, body?: unknown, form?: FormData): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError("Tidak ada koneksi. Periksa jaringan Anda.", 0);
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) window.location.assign("/login");
    throw new ApiError(data?.error ?? "Terjadi kesalahan. Coba lagi.", res.status, data?.fields);
  }
  return data as T;
}

type Row = Record<string, unknown> & { id: string };

export const api = {
  create: (type: ContentType, data: unknown) => request<Row>("POST", `/api/content/${type}`, data),
  update: (type: ContentType, id: string, data: unknown) => request<Row>("PUT", `/api/content/${type}/${id}`, data),
  remove: (type: ContentType, id: string) => request<void>("DELETE", `/api/content/${type}/${id}`),
  saveDraft: (doc: CopyDoc) => request<unknown>("PUT", "/api/page-copy/draft", doc),
  publish: () => request<unknown>("POST", "/api/page-copy/publish", {}),
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ id: string; url: string; width: number; height: number }>("POST", "/api/media", undefined, form);
  },
};
