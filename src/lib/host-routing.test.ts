import assert from "node:assert/strict";
import { test } from "node:test";
import { decide, type HostConfig } from "./host-routing";

const cfg: HostConfig = {
  publicHost: "example.co.id",
  cmsHost: "cms.mmiinternal.online",
  publicOrigin: "https://example.co.id",
};
const PUB = "example.co.id";
const CMS = "cms.mmiinternal.online";

test("public host maps paths into /site", () => {
  assert.deepEqual(decide(PUB, "/", "", cfg), { type: "rewrite", pathname: "/site" });
  assert.deepEqual(decide(PUB, "/tentang", "", cfg), { type: "rewrite", pathname: "/site/tentang" });
});

test("public host cannot reach the editor routes", () => {
  // /cms/x on the public host becomes /site/cms/x, which does not exist, so it 404s.
  assert.deepEqual(decide(PUB, "/cms", "", cfg), { type: "rewrite", pathname: "/site/cms" });
  assert.deepEqual(decide(PUB, "/cms/frame/home", "", cfg), { type: "rewrite", pathname: "/site/cms/frame/home" });
});

test("public host cannot reach the API except the health check", () => {
  for (const p of ["/api", "/api/auth/sign-in/email", "/api/admin/news"]) {
    assert.deepEqual(decide(PUB, p, "", cfg), { type: "rewrite", pathname: "/site/404" }, p);
  }
  assert.deepEqual(decide(PUB, "/api/health", "", cfg), { type: "pass" });
});

test("cms host maps paths into /cms and passes the API through", () => {
  assert.deepEqual(decide(CMS, "/", "", cfg), { type: "rewrite", pathname: "/cms" });
  assert.deepEqual(decide(CMS, "/login", "", cfg), { type: "rewrite", pathname: "/cms/login" });
  assert.deepEqual(decide(CMS, "/api/auth/get-session", "", cfg), { type: "pass" });
});

test("cms host never serves the public site", () => {
  // /tentang on the cms host is /cms/tentang, which does not exist.
  assert.deepEqual(decide(CMS, "/tentang", "", cfg), { type: "rewrite", pathname: "/cms/tentang" });
});

test("www redirects to the canonical origin and keeps path and query", () => {
  assert.deepEqual(decide("www.example.co.id", "/media", "?f=env", cfg), {
    type: "redirect",
    url: "https://example.co.id/media?f=env",
    permanent: true,
  });
});

test("unknown or missing hosts get a 404", () => {
  assert.deepEqual(decide("76.13.19.246", "/", "", cfg), { type: "notFound" });
  assert.deepEqual(decide("evil.example.com", "/cms", "", cfg), { type: "notFound" });
  assert.deepEqual(decide(null, "/", "", cfg), { type: "notFound" });
  assert.deepEqual(decide("example.co.id.evil.com", "/", "", cfg), { type: "notFound" });
});

test("host matching ignores case", () => {
  assert.deepEqual(decide("EXAMPLE.co.id", "/", "", cfg), { type: "rewrite", pathname: "/site" });
});

test("shared assets and the health check work on any host", () => {
  for (const host of [PUB, CMS, "127.0.0.1:3100", null]) {
    assert.deepEqual(decide(host, "/_next/static/a.js", "", cfg), { type: "pass" });
    assert.deepEqual(decide(host, "/media/abc/800.webp", "", cfg), { type: "pass" });
    assert.deepEqual(decide(host, "/api/health", "", cfg), { type: "pass" });
  }
});

test("a returning English reader is sent to /en with a temporary redirect", () => {
  assert.deepEqual(decide(PUB, "/", "", cfg, true), { type: "redirect", url: "https://example.co.id/en", permanent: false });
  assert.deepEqual(decide(PUB, "/media", "?f=env", cfg, true), {
    type: "redirect",
    url: "https://example.co.id/en/media?f=env",
    permanent: false,
  });
});

test("no redirect loop: /en paths, crawler files and shared assets are left alone", () => {
  assert.deepEqual(decide(PUB, "/en", "", cfg, true), { type: "rewrite", pathname: "/site/en" });
  assert.deepEqual(decide(PUB, "/en/karir", "", cfg, true), { type: "rewrite", pathname: "/site/en/karir" });
  assert.deepEqual(decide(PUB, "/sitemap.xml", "", cfg, true), { type: "rewrite", pathname: "/site/sitemap.xml" });
  assert.deepEqual(decide(PUB, "/robots.txt", "", cfg, true), { type: "rewrite", pathname: "/site/robots.txt" });
  assert.deepEqual(decide(PUB, "/static/logo-mark.png", "", cfg, true), { type: "pass" });
});

test("without the cookie (crawlers, first visit) Indonesian stays at the root", () => {
  assert.deepEqual(decide(PUB, "/tentang", "", cfg, false), { type: "rewrite", pathname: "/site/tentang" });
});

test("the language cookie never affects the editor host", () => {
  assert.deepEqual(decide(CMS, "/", "", cfg, true), { type: "rewrite", pathname: "/cms" });
});

test("English pages on the public host reach the English routes", () => {
  assert.deepEqual(decide(PUB, "/en/tentang", "", cfg), { type: "rewrite", pathname: "/site/en/tentang" });
});
