// End-to-end check of the visual editor, driven through your installed Chrome. DEV ONLY: it edits and
// deletes content in the database it points at, so run it against a local database, never production.
//
// Needs: `npm run dev` running; the local Postgres from .env; an editor account and a contributor account:
//   MMI_NEW_PASSWORD='...' npm run user:create -- --email editor@example.test --name Editor --role editor
//   MMI_NEW_PASSWORD='...' npm run user:create -- --email contrib@example.test --name Contrib --role contributor
//
//   E2E_EDITOR_PASSWORD=... E2E_CONTRIB_PASSWORD=... node scripts/e2e-editor.mjs path/to/photo.jpg [shots-dir]
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer-core";

const PHOTO = process.argv[2];
const SHOTS = process.argv[3];
const DB = process.env.E2E_DB ?? "mmi_website_dev";
const CMS = "http://cms.localhost:3000";
const PUBLIC = "http://localhost:3000";
const EDITOR = { email: process.env.E2E_EDITOR_EMAIL ?? "editor@example.test", password: process.env.E2E_EDITOR_PASSWORD };
const CONTRIB = { email: process.env.E2E_CONTRIB_EMAIL ?? "contrib@example.test", password: process.env.E2E_CONTRIB_PASSWORD };
if (!PHOTO || !EDITOR.password || !CONTRIB.password) {
  console.error("usage: E2E_EDITOR_PASSWORD=... E2E_CONTRIB_PASSWORD=... node scripts/e2e-editor.mjs photo.jpg [shots-dir]");
  process.exit(1);
}

const sql = (q) => execFileSync("psql", ["-d", DB, "-Atc", q]).toString().trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0;
let fail = 0;
const check = (name, ok, extra = "") => {
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${!ok && extra ? `   [${extra}]` : ""}`);
};
const pub = async (p = "/") => (await fetch(PUBLIC + p)).text();

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--no-sandbox"],
});
const errors = [];

async function openEditor(account) {
  sql("delete from rate_limit"); // login is rate limited, and this script logs in more than 5 times
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 200)));
  await page.goto(`${CMS}/login`, { waitUntil: "networkidle2" });
  await page.type("#email", account.email);
  await page.type("#password", account.password);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2" }), page.click("button.c-btn")]);
  await page.waitForSelector("iframe");
  await sleep(2500);
  const h = {
    page,
    frame: () => page.frames().find((f) => f.url().includes("/frame")),
    h2: () => page.$eval(".e-insp h2", (e) => e.textContent),
    kicker: () => page.$eval(".e-insp header .k", (e) => e.textContent),
    toast: () => page.$eval(".c-toast", (e) => (e.hidden ? "" : e.textContent)),
    status: () => page.$eval(".e-status span", (e) => e.textContent),
    setField: async (sel, text) => {
      await page.$eval(sel, (el) => {
        el.focus();
        el.select();
      });
      if (text) await page.keyboard.type(text);
      else await page.keyboard.press("Backspace");
    },
    clickText: (scope, text) =>
      page.evaluate(
        (s, t) => [...document.querySelectorAll(s)].find((b) => b.textContent.trim().includes(t))?.click(),
        scope,
        text,
      ),
    footBtn: (label) => page.evaluateHandle((l) => [...document.querySelectorAll(".e-insp .ft .c-btn")].find((b) => b.textContent.trim() === l), label),
    clickFoot: async (label) => (await h.footBtn(label)).click(),
    // The "+" button has no text, only a title.
    openFly: (name) => page.evaluate((n) => [...document.querySelectorAll(".e-rail button")].find((b) => b.title === n || b.textContent.includes(n))?.click(), name),
    flyItem: (text) => page.evaluateHandle((t) => [...document.querySelectorAll(".e-fly .e-item")].find((b) => b.textContent.includes(t)), text),
    terbitkan: () => page.$(".e-top .c-btn:last-child"),
    shot: (name) => (SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png` }) : null),
  };
  return h;
}

// Leave the database as we found it, whatever happened.
const reset = () =>
  sql(`update page_copy set text='{}', img='{}', published_at=null where version in ('draft','live');
       delete from news where title_id like 'Berita uji%' or title_id like 'Judul sementara%';
       delete from gallery; delete from videos; delete from jobs where title_id like 'Pekerjaan uji%'; delete from media;`);
reset();

try {
  // ------------------------------------------------------------------ editor
  const ed = await openEditor(EDITOR);
  const { page, frame } = ed;

  console.log("== inline text editing, autosave, draft vs live");
  await frame().hover('[data-ed="home-h1-1"]');
  await sleep(200);
  check("hover shows a label", await frame().$eval(".e-tip", (t) => !t.hidden && t.textContent === "Judul utama").catch(() => false));
  await frame().click('[data-ed="home-h1-1"]');
  await sleep(600);
  check("inspector shows the text editor", (await ed.h2()) === "Judul utama");
  check("text is open for typing in the canvas", await frame().evaluate(() => !!document.querySelector('[data-ed="home-h1-1"] [contenteditable]')));
  await page.keyboard.type(" UJI");
  await sleep(300);
  check("inspector textarea follows typing", (await page.$eval("#tk-id", (t) => t.value)).endsWith(" UJI"));
  await sleep(1500);
  check("autosaved as draft", sql("select text->'home-h1-1'->>'id' from page_copy where version='draft'").endsWith("UJI"));
  check("status says unpublished", (await ed.status()) === "Ada perubahan belum terbit", await ed.status());
  check("visitors do NOT see the draft", !(await pub()).includes("UJI"));
  await page.keyboard.press("Enter");
  await sleep(400);
  check("Enter ends editing and keeps the text", await frame().evaluate(() => !document.querySelector("[contenteditable]") && document.querySelector('[data-ed="home-h1-1"] .id').textContent.endsWith("UJI")));
  await (await ed.terbitkan()).click();
  await sleep(1500);
  check("Terbitkan publishes to visitors", (await pub()).includes("UJI"));
  check("status is clean after publishing", (await ed.status()) === "Situs sudah terbaru");
  check("publish is audited", sql("select count(*) from page_copy where version='live' and published_at is not null and updated_by is not null") === "1");
  await frame().click('[data-ed="home-h1-1"]');
  await sleep(500);
  await ed.clickText(".e-insp .ft .c-btn", "Kembalikan teks awal");
  await sleep(300);
  check("reset restores the default text", !(await page.$eval("#tk-id", (t) => t.value)).includes("UJI"));
  await sleep(1200);
  await (await ed.terbitkan()).click();
  await sleep(1200);
  check("heading is back to normal for visitors", !(await pub()).includes("UJI"));

  console.log("== language and canvas controls");
  await page.click('.e-seg[aria-label="Bahasa"] button:nth-child(2)');
  await sleep(500);
  check("EN toggle switches the canvas language", await frame().evaluate(() => document.body.dataset.lang === "en"));
  await page.click('.e-seg[aria-label="Bahasa"] button:nth-child(1)');
  await page.click('.e-seg[aria-label="Tampilan"] button:nth-child(2)');
  await sleep(600);
  check("phone toggle makes the canvas 390px", await page.$eval(".e-frame", (f) => Math.round(f.getBoundingClientRect().width) === 390));
  check("phone canvas uses the real mobile layout", await frame().evaluate(() => getComputedStyle(document.querySelector(".menu-btn")).display !== "none"));
  await ed.shot("phone");
  await page.click('.e-seg[aria-label="Tampilan"] button:nth-child(1)');

  console.log("== existing news item: live typing, guard, save, validation");
  const firstTitle = sql("select title_id from news where status='pub' order by date desc limit 1");
  await frame().click(".lead .story");
  await sleep(700);
  check("clicking a card opens its form", (await ed.kicker()).startsWith("Berita") && (await ed.h2()) === firstTitle);
  check("card is outlined as selected", await frame().evaluate(() => !!document.querySelector(".cv-sel")));
  await ed.setField("#f-titleId", "Judul sementara");
  await sleep(500);
  check("canvas shows the title as typed, before saving", await frame().evaluate(() => document.querySelector(".lead .story h3 .id").textContent === "Judul sementara"));
  check("nothing saved yet", sql("select count(*) from news where title_id='Judul sementara'") === "0");
  await frame().click('[data-ed="home-h1-1"]');
  await sleep(500);
  check("leaving with unsaved changes is blocked", (await page.$(".c-warn")) !== null && (await ed.toast()).includes("Simpan atau buang"));
  await ed.shot("guard");
  await page.click(".c-warn .c-btn.ghost");
  await sleep(300);
  check("'Tetap di sini' keeps the form", (await page.$("#f-titleId")) !== null);
  await ed.clickFoot("Simpan");
  await sleep(1200);
  check("save confirms in plain language", (await ed.toast()).includes("Disimpan"), await ed.toast());
  check("saved with who and when", sql(`select count(*) from news n join "user" u on u.id=n.updated_by where n.title_id='Judul sementara' and u.email='${EDITOR.email}'`) === "1");
  check("public site shows it without a deploy", (await pub()).includes("Judul sementara"));
  await ed.setField("#f-titleId", "");
  await ed.clickFoot("Simpan");
  await sleep(900);
  check("empty required title shows an inline error", (await page.$(".c-f.err .msg")) !== null && (await page.$eval(".c-f.err .msg", (m) => m.textContent)).includes("wajib diisi"));
  check("toast says to check the fields", (await ed.toast()).includes("Periksa kolom"));
  await ed.shot("validation");
  await frame().click('[data-ed="home-h1-1"]');
  await sleep(300);
  await page.click(".c-warn .c-btn.danger");
  await sleep(300);
  sql(`update news set title_id='${firstTitle.replace(/'/g, "''")}' where title_id='Judul sementara'`);

  console.log("== create, publish and delete a news item");
  await ed.openFly("Tambah");
  await sleep(300);
  await (await ed.flyItem("Tulis berita")).click();
  await sleep(500);
  check("new-item form opens", (await ed.kicker()).includes("Baru"));
  await page.type("#f-titleId", "Berita uji editor");
  await page.type("#f-titleEn", "Editor test news");
  await ed.clickFoot("Simpan draf");
  await sleep(1200);
  check("draft saved, not on the public site", sql("select status from news where title_id='Berita uji editor'") === "draft" && !(await pub("/media")).includes("Berita uji editor"));
  await ed.clickFoot("Terbitkan");
  await sleep(1200);
  check("publish goes live immediately", (await pub("/media")).includes("Berita uji editor"));
  check("English title shows on the English page", (await pub("/en/media")).includes("Editor test news"));
  await frame().click('[data-ed="home-h1-1"]');
  await sleep(400);
  await ed.openFly("Konten");
  await sleep(300);
  await (await ed.flyItem("Berita")).click();
  await sleep(300);
  await (await ed.flyItem("Berita uji editor")).click();
  await sleep(600);
  check("opening from the content list works", (await ed.h2()) === "Berita uji editor");
  await ed.clickFoot("Hapus");
  await sleep(300);
  check("delete asks for confirmation first", (await page.$(".e-insp .confirm")) !== null && sql("select count(*) from news where title_id='Berita uji editor'") === "1");
  await ed.clickText(".e-insp .ft .c-btn", "Ya, hapus");
  await sleep(1000);
  check("confirmed delete removes it", sql("select count(*) from news where title_id='Berita uji editor'") === "0");

  console.log("== videos and jobs");
  await ed.openFly("Tambah");
  await sleep(300);
  await (await ed.flyItem("Tambah lowongan")).click();
  await sleep(500);
  await page.type("#f-titleId", "Pekerjaan uji");
  await ed.setField("#f-url", "https://www.linkedin.com/jobs/1");
  await ed.clickFoot("Simpan");
  await sleep(900);
  check("a LinkedIn link is refused for jobs", (await page.$eval(".c-f.err .msg", (m) => m.textContent).catch(() => "")).includes("JobStreet"));
  await ed.setField("#f-url", "https://id.jobstreet.com/id/job/1");
  await ed.clickFoot("Simpan");
  await sleep(1200);
  check("JobStreet job saved and open", sql("select status from jobs where title_id='Pekerjaan uji'") === "open");
  await page.click('select[aria-label="Halaman"]');
  await page.select('select[aria-label="Halaman"]', "careers");
  await sleep(400);
  check("new job appears on the careers page in the canvas", await frame().evaluate(() => [...document.querySelectorAll(".job h3")].some((h) => h.textContent.includes("Pekerjaan uji"))));

  console.log("== preview mode");
  await ed.clickText(".e-top .c-btn", "Pratinjau");
  await sleep(500);
  check("preview has no edit outlines or hooks", await frame().evaluate(() => !document.body.classList.contains("cv-on") && document.querySelectorAll("[data-ed],[data-col],[data-img]").length === 0));
  await frame().click('a[href="/media"]');
  await sleep(600);
  check("clicking the site menu switches the editor page", (await page.$eval('select[aria-label="Halaman"]', (s) => s.value)) === "media");
  await ed.shot("preview");
  await ed.clickText(".e-top .c-btn", "Kembali mengedit");
  await sleep(400);

  console.log("== photo upload into the gallery");
  await ed.openFly("Media");
  await sleep(300);
  const [chooser] = await Promise.all([page.waitForFileChooser(), ed.clickText(".e-fly .c-btn", "Pilih foto")]);
  await chooser.accept([PHOTO]);
  await sleep(4000);
  check("photo lands in the gallery as web sizes", sql("select count(*) from gallery") === "1" && sql("select count(*) from media") === "1");
  check("the photo shows in the canvas on the Media page", await frame().evaluate(() => document.querySelectorAll("#gallery img").length === 1));
  await ed.shot("media");
  await page.click(".e-fly .x"); // the flyout overlays the left of the canvas
  await sleep(200);
  await frame().click("#gallery figure");
  await sleep(600);
  check("clicking a gallery photo opens its form", (await ed.kicker()).startsWith("Foto galeri"));
  await ed.clickFoot("Hapus");
  await sleep(300);
  await ed.clickText(".e-insp .ft .c-btn", "Ya, hapus");
  await sleep(1200);
  check("deleting the last use removes the photo files", sql("select count(*) from media") === "0");

  console.log("== page photo slot");
  await page.select('select[aria-label="Halaman"]', "home");
  await sleep(500);
  await frame().click('[data-img="hero"]');
  await sleep(500);
  check("clicking a photo slot opens the photo panel", (await ed.kicker()) === "Foto halaman");
  const [chooser2] = await Promise.all([page.waitForFileChooser(), ed.clickText(".e-insp .c-btn", "Pilih foto")]);
  await chooser2.accept([PHOTO]);
  await sleep(4000);
  check("hero photo shows in the canvas", await frame().evaluate(() => !!document.querySelector('[data-img="hero"] img')));
  await sleep(1500);
  check("it is in the draft but not yet live for visitors", sql("select img->>'hero' is not null from page_copy where version='draft'") === "t" && !(await pub()).includes('class="hero-media ph cut has-img"'));
  await (await ed.terbitkan()).click();
  await sleep(1500);
  check("after Terbitkan visitors see the hero photo", (await pub()).includes("has-img"));
  await ed.shot("hero");

  // ------------------------------------------------------------------ contributor
  console.log("== contributor");
  const co = await openEditor(CONTRIB);
  check("Terbitkan is disabled for a contributor", await co.page.$eval(".e-top .c-btn:last-child", (b) => b.disabled));
  await co.frame().click(".lead .story");
  await sleep(700);
  check("a live item opens read-only with an explanation", (await co.page.$(".c-warn")) !== null && (await co.page.$eval("#f-titleId", (i) => i.disabled)));
  check("a read-only item has no save button", !(await co.page.evaluate(() => [...document.querySelectorAll(".e-insp .ft .c-btn")].some((b) => b.textContent.trim() === "Simpan"))));
  await co.shot("contributor-readonly");
  await co.frame().click('[data-ed="home-h1-1"]');
  await sleep(400);
  await co.page.keyboard.type(" KONTRIBUTOR");
  await sleep(1500);
  check("a contributor can edit the page-text draft", sql("select text->'home-h1-1'->>'id' from page_copy where version='draft'").endsWith("KONTRIBUTOR"));
  check("but visitors don't see it", !(await pub()).includes("KONTRIBUTOR"));
  await co.openFly("Tambah");
  await sleep(300);
  await (await co.flyItem("Tulis berita")).click();
  await sleep(500);
  await co.page.type("#f-titleId", "Berita uji kontributor");
  const labels = await co.page.evaluate(() => [...document.querySelectorAll(".e-insp .ft .c-btn")].map((b) => b.textContent.trim()));
  check("a contributor only gets 'Simpan draf', no Terbitkan", labels.includes("Simpan draf") && !labels.includes("Terbitkan"), labels.join(","));
  await co.clickFoot("Simpan draf");
  await sleep(1200);
  check("the contributor's draft is saved as a draft", sql("select status from news where title_id='Berita uji kontributor'") === "draft");
} catch (err) {
  fail++;
  console.log("FAIL script error:", err?.stack ?? err);
} finally {
  reset();
  console.log(errors.length ? `page errors:\n${[...new Set(errors)].join("\n")}` : "no page errors");
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close();
  process.exit(fail ? 1 : 0);
}
