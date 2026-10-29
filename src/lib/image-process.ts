import sharp, { type OutputInfo } from "sharp";
import { MEDIA_SIZES, type MediaSize } from "@/lib/media";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // CLAUDE.md section 6
const MAX_INPUT_PIXELS = 100_000_000; // refuses decompression bombs: a tiny file that expands to gigapixels
const TARGET_BYTES = 400 * 1024; // the largest size should stay under this
// The largest size is squeezed to TARGET_BYTES: first by lowering quality (never below 58, where WebP
// starts to look blotchy), then by shrinking the width in steps down to MIN_WIDTH.
const QUALITIES = [80, 72, 64, 58];
const MIN_WIDTH = 1200;
const WIDTH_STEPS = [1, 0.9, 0.8, 0.7];

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

// sharp is memory hungry on a small shared server: no cache, one image at a time.
sharp.cache(false);
sharp.concurrency(1);

export class UploadError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export type Variant = { size: MediaSize; data: Buffer; width: number; height: number };

// Turns an uploaded photo into web-sized WebP files. The file type is decided by decoding the
// bytes, never by the file name or the browser's Content-Type, so a renamed .exe or .svg is rejected.
// EXIF (including GPS position) is dropped, and phone-rotated photos are turned upright.
export async function processImage(input: Buffer): Promise<Variant[]> {
  if (input.length === 0) throw new UploadError("File kosong.", 400);
  if (input.length > MAX_UPLOAD_BYTES) throw new UploadError("Foto lebih dari 20 MB.", 413);

  let format: string | undefined;
  try {
    format = (await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata()).format;
  } catch {
    throw new UploadError("Pilih file JPG, PNG atau WEBP.", 415);
  }
  if (!format || !ALLOWED_FORMATS.has(format)) throw new UploadError("Pilih file JPG, PNG atau WEBP.", 415);

  const variants: Variant[] = [];
  // Largest first, so the 800 and 400 sizes come from the same upright source.
  for (const size of [...MEDIA_SIZES].reverse()) {
    try {
      variants.push(await encode(input, size));
    } catch {
      throw new UploadError("Foto rusak atau terlalu besar untuk diproses.", 422);
    }
  }
  return variants.sort((a, b) => a.size - b.size);
}

async function encode(input: Buffer, size: MediaSize): Promise<Variant> {
  const isLargest = size === MEDIA_SIZES[MEDIA_SIZES.length - 1];
  // The small sizes are far below the byte target already, so they get one pass.
  const widths = isLargest ? WIDTH_STEPS.map((f) => Math.max(MIN_WIDTH, Math.round(size * f))) : [size];
  const qualities = isLargest ? QUALITIES : [QUALITIES[1]];

  let last: { data: Buffer; info: OutputInfo } | undefined;
  for (const width of [...new Set(widths)]) {
    for (const quality of qualities) {
      last = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality })
        .toBuffer({ resolveWithObject: true });
      if (last.data.length <= TARGET_BYTES) return done(size, last);
    }
  }
  return done(size, last!); // best effort: the smallest attempt
}

const done = (size: MediaSize, r: { data: Buffer; info: OutputInfo }): Variant => ({
  size,
  data: r.data,
  width: r.info.width,
  height: r.info.height,
});
