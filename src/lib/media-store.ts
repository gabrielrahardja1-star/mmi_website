import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { getDb } from "@/db";
import { media } from "@/db/schema";
import { getEnv } from "@/lib/env";
import { processImage } from "@/lib/image-process";
import { MEDIA_SIZES } from "@/lib/media";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const uploadRoot = () => resolve(getEnv().UPLOAD_DIR);
export const variantPath = (id: string, size: number) => join(uploadRoot(), id, `${size}.webp`);

// Resizing is memory hungry and the VPS is shared, so uploads are processed strictly one at a time.
let queue: Promise<unknown> = Promise.resolve();
function oneAtATime<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => undefined);
  return run;
}

export type SavedMedia = { id: string; width: number; height: number };

// Validates and resizes the photo, writes the three sizes to disk, and records it in the media table.
// Throws UploadError for anything the editor should be told about.
export function saveUpload(input: Buffer, originalName: string, userId: string): Promise<SavedMedia> {
  return oneAtATime(async () => {
    const variants = await processImage(input);
    const id = randomUUID();
    const dir = join(uploadRoot(), id);
    await mkdir(dir, { recursive: true });
    try {
      for (const v of variants) {
        // Write then rename, so a half-written file is never served.
        const tmp = join(dir, `${v.size}.webp.tmp`);
        await writeFile(tmp, v.data);
        await rename(tmp, variantPath(id, v.size));
      }
      const largest = variants[variants.length - 1];
      await getDb()
        .insert(media)
        .values({
          id,
          originalName: basename(originalName).slice(0, 200) || "foto",
          mime: "image/webp",
          width: largest.width,
          height: largest.height,
          bytes: largest.data.length,
          createdBy: userId,
        });
      return { id, width: largest.width, height: largest.height };
    } catch (err) {
      await rm(dir, { recursive: true, force: true });
      throw err;
    }
  });
}

export async function removeMediaFiles(id: string): Promise<void> {
  if (!UUID_RE.test(id)) return;
  await rm(join(uploadRoot(), id), { recursive: true, force: true });
}

export const MEDIA_FILE_NAMES = MEDIA_SIZES.map((s) => `${s}.webp`);
