import assert from "node:assert/strict";
import { test } from "node:test";
import { CONTENT_SCHEMAS, fieldErrors, isJobStreetUrl, isYouTubeUrl } from "./content-schemas";
import { checkWrite } from "./permissions";
import { copyDiffers, pageCopyInput } from "./page-copy-schema";

const UUID = "bb8fb42a-2b3a-4fca-a12e-b4fa6a9ddc03";

test("contributors can only create and edit drafts", () => {
  assert.equal(checkWrite("contributor", "news", null, "draft").ok, true);
  assert.equal(checkWrite("contributor", "news", "draft", "draft").ok, true);
  assert.equal(checkWrite("contributor", "news", "draft", "pub").ok, false, "cannot publish");
  assert.equal(checkWrite("contributor", "news", "pub", "draft").ok, false, "cannot unpublish");
  assert.equal(checkWrite("contributor", "news", "pub", null).ok, false, "cannot delete live");
  assert.equal(checkWrite("contributor", "news", "draft", null).ok, true, "can delete a draft");
});

test("for gallery, videos and jobs 'live' means show / show / open", () => {
  assert.equal(checkWrite("contributor", "gallery", null, "show").ok, false);
  assert.equal(checkWrite("contributor", "gallery", null, "hidden").ok, true);
  assert.equal(checkWrite("contributor", "videos", "show", "hidden").ok, false);
  assert.equal(checkWrite("contributor", "jobs", null, "open").ok, false);
  assert.equal(checkWrite("contributor", "jobs", "closed", "closed").ok, true);
});

test("editors and admins can do everything", () => {
  for (const role of ["editor", "admin"] as const) {
    assert.equal(checkWrite(role, "news", "pub", "pub").ok, true);
    assert.equal(checkWrite(role, "jobs", "open", null).ok, true);
  }
});

test("news: required title, length limits, valid category and date", () => {
  const ok = { cat: "com", date: "2026-10-17", titleId: "Judul", status: "draft" };
  assert.ok(CONTENT_SCHEMAS.news.safeParse(ok).success);
  const bad = CONTENT_SCHEMAS.news.safeParse({ ...ok, titleId: " ", titleEn: "x".repeat(91), cat: "nope", date: "2026-02-31" });
  assert.ok(!bad.success);
  const e = fieldErrors(bad.error);
  assert.match(e.titleId, /wajib diisi/);
  assert.match(e.titleEn, /maksimal 90/);
  assert.ok(e.cat && e.date);
});

test("unknown fields are rejected, so a client can't set updatedBy or id", () => {
  const r = CONTENT_SCHEMAS.news.safeParse({ cat: "com", date: "2026-10-17", titleId: "x", status: "draft", updatedBy: "someone" });
  assert.ok(!r.success);
});

test("an empty cover image or press date becomes null", () => {
  const n = CONTENT_SCHEMAS.news.parse({ cat: "com", date: "2026-10-17", titleId: "x", status: "draft", coverImageId: "" });
  assert.equal(n.coverImageId, null);
  const a = CONTENT_SCHEMAS.articles.parse({ source: "S", url: "https://x.co/a", title: "T", status: "pub", date: "" });
  assert.equal(a.date, null);
});

test("links: https only, YouTube-only videos, JobStreet-only jobs", () => {
  const art = { source: "S", title: "T", status: "pub" };
  assert.ok(!CONTENT_SCHEMAS.articles.safeParse({ ...art, url: "http://x.co/a" }).success);
  assert.ok(!CONTENT_SCHEMAS.articles.safeParse({ ...art, url: "javascript:alert(1)" }).success);
  const vid = { titleId: "V", date: "2026-10-01", status: "show" };
  assert.ok(CONTENT_SCHEMAS.videos.safeParse({ ...vid, url: "https://www.youtube.com/watch?v=abc" }).success);
  assert.ok(CONTENT_SCHEMAS.videos.safeParse({ ...vid, url: "https://youtu.be/abc" }).success);
  assert.ok(!CONTENT_SCHEMAS.videos.safeParse({ ...vid, url: "https://vimeo.com/1" }).success);
  assert.ok(!CONTENT_SCHEMAS.videos.safeParse({ ...vid, url: "https://evil.com/youtube.com/x" }).success);
  assert.equal(isYouTubeUrl("https://notyoutube.com/x"), false);
  const job = { titleId: "J", location: "Sungai Pinang", typeId: "Penuh waktu", status: "open" };
  assert.ok(CONTENT_SCHEMAS.jobs.safeParse({ ...job, url: "https://id.jobstreet.com/id/job/1" }).success);
  assert.ok(!CONTENT_SCHEMAS.jobs.safeParse({ ...job, url: "https://www.linkedin.com/jobs/view/1" }).success);
  assert.equal(isJobStreetUrl("https://jobstreet.evil.com/x"), false);
  assert.equal(isJobStreetUrl("https://evil.com/jobstreet.com"), false);
  assert.equal(isJobStreetUrl("https://jobstreet.com.evil.com/x"), false);
  assert.equal(isJobStreetUrl("https://notjobstreet.com/x"), false);
  assert.equal(isJobStreetUrl("https://user@evil.com/jobstreet.com"), false);
  assert.equal(isJobStreetUrl("https://www.jobstreet.co.id/id/job/1"), true);
  assert.equal(isJobStreetUrl("https://id.jobstreet.com/"), true);
});

test("jobs only accept the three known job types", () => {
  const job = { titleId: "J", location: "L", url: "https://id.jobstreet.com/x", status: "open" };
  assert.ok(CONTENT_SCHEMAS.jobs.safeParse({ ...job, typeId: "Kontrak" }).success);
  assert.ok(!CONTENT_SCHEMAS.jobs.safeParse({ ...job, typeId: "Freelance" }).success);
});

test("gallery needs a photo", () => {
  const g = { date: "2026-10-01", status: "show" };
  assert.ok(!CONTENT_SCHEMAS.gallery.safeParse(g).success);
  assert.ok(CONTENT_SCHEMAS.gallery.safeParse({ ...g, imageId: UUID }).success);
});

test("page copy: only known keys, line breaks folded, photo slots validated", () => {
  const ok = pageCopyInput.parse({ text: { "home-h1-1": { id: "Satu\n  dua", en: "" } }, img: { hero: UUID, team: "" } });
  assert.equal(ok.text["home-h1-1"].id, "Satu dua");
  assert.equal(ok.img.team, null);
  assert.ok(!pageCopyInput.safeParse({ text: { "made-up-key": { id: "x", en: "x" } }, img: {} }).success);
  assert.ok(!pageCopyInput.safeParse({ text: {}, img: { banner: UUID } }).success);
  assert.ok(!pageCopyInput.safeParse({ text: {}, img: { hero: "not-a-uuid" } }).success);
});

test("copyDiffers ignores defaults and only flags real changes", () => {
  assert.equal(copyDiffers({ text: {}, img: {} }, null), false);
  // A key saved with its default text is not a change.
  assert.equal(copyDiffers({ text: { "home-h1-1": { id: "Menambang batu bara di bawah tanah Kalimantan Selatan.", en: "Mining coal underground in South Kalimantan." } }, img: {} }, { text: {}, img: {} }), false);
  assert.equal(copyDiffers({ text: { "home-h1-1": { id: "Baru", en: "New" } }, img: {} }, { text: {}, img: {} }), true);
  assert.equal(copyDiffers({ text: {}, img: { hero: UUID } }, { text: {}, img: {} }), true);
  assert.equal(copyDiffers({ text: {}, img: { hero: UUID } }, { text: {}, img: { hero: UUID } }), false);
});
