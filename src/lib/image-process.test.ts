import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { processImage, UploadError } from "./image-process";

// A smooth, photo-like picture (gradients plus mild texture) so the size targets are meaningful.
async function photo(width: number, height: number, format: "jpeg" | "png" | "webp" = "jpeg", exif = false) {
  const raw = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      raw[i] = (x * 255) / width;
      raw[i + 1] = (y * 255) / height;
      raw[i + 2] = 128 + ((x * y) % 7);
    }
  }
  let img = sharp(raw, { raw: { width, height, channels: 3 } });
  if (exif) img = img.withMetadata({ orientation: 6, exif: { IFD0: { Copyright: "secret" } } });
  return img[format]().toBuffer();
}

const rejects = async (input: Buffer, status: number) =>
  assert.rejects(processImage(input), (e: unknown) => e instanceof UploadError && e.status === status);

test("a large JPEG becomes 400, 800 and 1800px WebP, the biggest under 400 KB", async () => {
  const v = await processImage(await photo(4000, 3000));
  assert.deepEqual(v.map((x) => x.size), [400, 800, 1800]);
  assert.deepEqual(v.map((x) => x.width), [400, 800, 1800]);
  assert.ok(v[2].data.length <= 400 * 1024, `1800px was ${v[2].data.length} bytes`);
  for (const x of v) assert.equal((await sharp(x.data).metadata()).format, "webp");
});

test("PNG and WEBP uploads are accepted", async () => {
  assert.equal((await processImage(await photo(1200, 800, "png"))).length, 3);
  assert.equal((await processImage(await photo(1200, 800, "webp"))).length, 3);
});

test("small photos are never enlarged", async () => {
  const v = await processImage(await photo(300, 200));
  assert.deepEqual(v.map((x) => x.width), [300, 300, 300]);
});

test("phone-rotated photos come out upright and without EXIF", async () => {
  // Stored 600x400 with orientation 6 (rotate 90 degrees): it displays as 400 wide, 600 tall.
  const v = await processImage(await photo(600, 400, "jpeg", true));
  const big = v[2];
  assert.equal(big.width, 400);
  assert.equal(big.height, 600);
  const meta = await sharp(big.data).metadata();
  assert.equal(meta.exif, undefined);
  assert.equal(meta.orientation, undefined);
});

test("files are judged by their contents, not their names or claimed type", async () => {
  await rejects(Buffer.from("MZ\x90\x00this is an exe renamed to .jpg"), 415);
  await rejects(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 415);
  await rejects(Buffer.from("just text"), 415);
  const gif = await sharp(await photo(50, 50)).gif().toBuffer();
  await rejects(gif, 415);
  const tiff = await sharp(await photo(50, 50)).tiff().toBuffer();
  await rejects(tiff, 415);
});

test("empty and oversized uploads are refused", async () => {
  await rejects(Buffer.alloc(0), 400);
  await rejects(Buffer.alloc(21 * 1024 * 1024, 1), 413);
});

test("a truncated JPEG is refused instead of crashing", async () => {
  const good = await photo(1200, 800);
  await rejects(good.subarray(0, Math.floor(good.length / 3)), 422);
});
