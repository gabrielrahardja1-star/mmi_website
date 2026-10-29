# MMI Website + Editor: build handover

You are building the production version of a prototype that is already designed and agreed. The UI and UX are settled. Your job is the real backend, hosting, auth, and turning the prototype into a maintainable codebase. **Match the prototype's look and behaviour. Do not redesign.**

Company: PT Merge Mining Industri (MMI), brand "MergeCoal". An underground longwall coal mine in South Kalimantan, Indonesia.

---

## 1. What's in this folder

| Path | What it is |
|---|---|
| `prototype/standalone.html` | **Open this first.** The full prototype, runnable from disk in any browser. Site at the default URL, editor at `#cms`. Data is stored in your browser's localStorage. Reset with `localStorage.removeItem("mmi-proto-db")`. |
| `prototype/prototype-artifact.html` | The same page as published on claude.ai. It expects the claude.ai runtime (`window.claude.use(...)`), so it won't run on its own. Use it as the source of truth for markup, CSS and JS. |
| `data/seed/news.json`, `articles.json`, `jobs.json` | Content to load into the production database. The jobs are **placeholders** (titles end in "(contoh)"). Replace them before launch. |
| `data/page-copy-defaults.json` | Every editable text block on the static pages (54 keys), with Indonesian and English defaults, plus the 3 page photo slots. |
| `assets/logo-mark.png` | The logo icon, transparent background. |
| `assets/logo-full-original.png` | The logo with the "MergeCoal" wordmark, as supplied. Ask for an SVG and a white (reversed) version before launch. |

---

## 2. What to build

Two apps that share one database and one file store.

1. **Public website** (for example `mergecoal.co.id`): read-only, bilingual (ID default, EN toggle), no login and no edit controls anywhere.
2. **Editor app** (for example `admin.mergecoal.co.id`): its own login, Wix-style visual editor. It must **not** be reachable from the website's navigation.

Shared:
- **Database:** Postgres is fine. Tables in section 4.
- **File storage** for uploaded photos (S3-compatible or similar). Resize and compress on upload: the site needs web sizes (about 1800px max, under 400 KB), not 5 MB originals.
- **Auth for the editor only:** email and password at minimum, with roles in section 6.

### Hosting constraint (important)
**Do not host this on the VPS that runs MMI's internal apps and data.** A public website is the most attacked thing a company owns. Use separate hosting so a compromised site can't reach production data.

### Handover constraint
The person commissioning this leaves MMI on 31 December 2026. Choose a stack and hosting that someone else can maintain: managed services, few moving parts, a clear README, and env-based config. Avoid clever custom infrastructure.

Stack is your call. A reasonable default: Next.js (site and editor, as separate apps or route groups on separate domains), Postgres, an S3-compatible bucket, and a standard auth library. A headless CMS (Payload, Directus, Strapi) is acceptable **only if** the editor UI in section 5 can still be delivered as designed.

---

## 3. The website (see `standalone.html`)

Pages, using hash routes in the prototype (use real paths in production):

| Page | Route | Content |
|---|---|---|
| Beranda (Home) | `/` | Hero (headline, intro, 2 buttons, photo), "Who we are" block, latest 3 published news (1 lead + 2 compact), featured video (only if one is flagged), careers banner |
| Tentang Kami (About) | `/tentang` | Profile, Vision & Mission, Core Values |
| Media | `/media` | All published news with category filter, photo gallery (7 latest visible photos), videos |
| Artikel (Articles) | `/artikel` | External press coverage. Each links out to the publisher in a new tab |
| Karir (Careers) | `/karir` | Open jobs table (each links to JobStreet), hiring steps, recruitment scam warning |

Footer: logo, short tagline, nav links, mine location ("Kecamatan Sungai Pinang, Kalimantan Selatan, Indonesia"), contact email, social links.

**Language:** every text field has ID and EN versions. If EN is empty, show the ID text. The toggle is remembered per visitor.

**Empty states:** every content list has a designed empty state (see the prototype). Never show a blank section.

**SEO and basics the prototype skips** (add these): real URL paths, per-page `<title>` and meta description in both languages, `hreflang`, Open Graph image, sitemap, favicon from the logo mark, a 404 page, and image `alt` text from captions.

---

## 4. Data model

Every content row has `status` and `updated_at`. Text fields come in `_id` / `_en` pairs (in the prototype: `tId`/`tEn`, `sId`/`sEn`, and so on).

**news**: `cat` (`com` Masyarakat/Community, `env` Lingkungan/Environment, `safe` Keselamatan/Safety, `event` Kegiatan/Company), `date`, `title_id`/`title_en` (required ID, max 90), `summary_id`/`summary_en` (max 220), `cover_image` (optional), `status` (`draft`|`pub`).

**articles** (external press): `source` (outlet name), `url` (https, required), `date` (optional), `title` (the original headline, not translated), `summary_id`/`summary_en` (max 200, written in our own words), `status` (`draft`|`pub`).

**gallery**: `image` (required), `caption_id`/`caption_en` (max 120, also used as alt text), `date`, `status` (`show`|`hidden`).

**videos**: `url` (must be YouTube), `title_id`/`title_en`, `date`, `home` (boolean, **only one** can be true; setting it clears the others), `status` (`show`|`hidden`).

**jobs**: `title_id`/`title_en`, `location`, `type_id` (Penuh waktu / Kontrak / Magang), `type_en` (derived: Full-time / Contract / Internship), `url` (JobStreet listing), `order`, `status` (`open`|`closed`).

**page_copy**: two versions, **draft** and **live**. Each holds `text: { key: {id, en} }` and `img: { hero|team|about: imageId }`. Keys and defaults are in `data/page-copy-defaults.json`. A missing key falls back to the default.

### Publishing rules (match exactly)
- **Page text and page photos:** edits autosave to the **draft**. Visitors see the **live** version. The editor's **Terbitkan** (Publish) button copies draft to live. Its status shows "Ada perubahan belum terbit" when draft ≠ live.
- **News and articles:** have their own Draft and Publish buttons. Published items go live immediately, without the page-level Publish.
- **Gallery, videos, jobs:** go live on save, based on their `status`.

The home page shows the 3 newest **published** news by `date`. Only `pub`, `show` and `open` items appear on the site.

---

## 5. The editor (see `standalone.html#cms`)

Wix-style visual editor. Layout: top bar, left tool rail, the **real website rendered in the centre canvas**, and an inspector panel on the right. All editor UI is in **Bahasa Indonesia**.

**Top bar:** brand · page switcher · ID/EN content language · desktop/phone canvas toggle · save status · Pratinjau (preview) · exit to site · **Terbitkan**.

**Left rail (opens flyout panels):**
- **+ Tambah:** create news, gallery photos, job, video, press article.
- **Halaman:** switch page.
- **Konten:** each collection with counts → searchable item list → open an item in the inspector.
- **Media:** drag-and-drop multi-photo upload into the gallery, plus a grid of existing photos.

**Canvas behaviour:**
- Hover over an editable element: dashed outline plus a small label ("Judul utama", "Berita · klik untuk edit"). Selected: solid outline.
- **Text** (`data-ed` elements): click to edit inline in the current language. Enter ends editing. The inspector shows ID and EN textareas in sync, plus "Kembalikan teks awal" (reset to default).
- **Page photos** (`data-img`): click → inspector with upload, replace and remove. Photos are cropped to fit the frame.
- **Content items** (news cards, job rows, videos, gallery photos, press items carry `data-col` and `data-id`): click → inspector form for that item. The canvas updates live while you type, before saving.
- Links and navigation don't fire while editing. Clicking the site nav switches the editor's page.
- **Phone toggle:** the canvas renders the real mobile layout. The prototype mirrors the site's `max-width` media rules onto a 390px frame. In production you could use an iframe at 390px instead.
- **Preview mode:** no outlines, the site behaves like the live one, and the nav switches pages.

**Inspector forms:** field validation with inline errors (required fields, https links, YouTube-only video links). Delete needs an inline confirmation. If you try to switch selection with unsaved changes, you get a warning with "Tetap di sini" (stay here) and "Buang perubahan" (discard changes). Toasts confirm every action in plain language. Field definitions are in the `T` object in the prototype's script.

**Narrow screens:** the editor must still work on a phone, with the inspector as a bottom sheet. It's designed for laptops first.

---

## 6. Auth and roles (production)

- Editor login is separate from the site, so no login link appears on the public site.
- Suggested roles: **Admin** (users, everything), **Editor** (all content and publishing), **Contributor** (create and edit drafts only, can't publish), optional.
- Keep an audit trail (`updated_by`, `updated_at`) on every row and on page_copy publishes.
- Rate-limit login, use secure cookies, enable 2FA if your auth library supports it, and validate uploads by real file type and size (JPG/PNG/WEBP, max 20 MB in, resized on the server).

---

## 7. Design system (keep it)

- **Colours:** brand blue `#3E82C4`; button blue `#3778B8` (darker, so white text passes contrast); deep blue `#2B5F94`; tint `#F1F6FB`; lines `#DDE5EE`; ink `#0F1419`; secondary text `#56616C`; white background. Single light theme by design.
- **Type:** Archivo (headings, set at width 112%), IBM Plex Sans (body). The company name next to the logo uses Outfit 600, to match the wordmark.
- **Shape:** 3px radius everywhere and one spacing scale (8/16/24/40/64/96). The **angled corner cut** (from the hexagon logo) is the identity device. It's used on the hero photo, the About photo and the careers banner. Don't add more.
- **Things deliberately avoided** (keep avoiding them): eyebrow labels above headings, gradient or coloured words in headlines, pill-shaped buttons, glassmorphism, decorative numbering, identical card grids in every section, emoji, em dashes in copy, scroll fade-ins, stock "AI" imagery, buzzwords.

---

## 8. Content and policy rules (non-negotiable)

- **No names of staff, managers or leadership** anywhere on the site.
- **No business figures:** no production volumes, reserves, buyers, prices or contract details. Keep the company description general.
- **Location stays vague:** "Kecamatan Sungai Pinang, Kalimantan Selatan." No map, no Jakarta office address.
- **Jobs link to JobStreet only** (no LinkedIn job links). The scam notice must say MMI never charges recruitment fees and only posts on the site and its official JobStreet page.
- **Press page:** headline, outlet, date and our own one-line summary only. Never copy article text.
- **Photos:** anyone shown must be in correct PPE, and staff must have agreed to appear.
- No religious holiday greetings in the news feed.

---

## 9. Open items before launch (not yours to invent; leave clear placeholders)

- Vision, mission and core values are **drafts** and need management sign-off.
- Company history paragraph (About) is waiting on management.
- Contact email, HR email in the scam notice, and social links are placeholders.
- Real photos for hero, team and About slots, and original (text-free) photos for news posts.
- The ShalokalIndonesia article has no date. Confirm it.
- The 4 seed jobs are fake. Replace them or close them.
- Official logo SVG and a white version.
- Final domain name.

---

## 10. Done means

- [ ] The site matches `standalone.html` visually at 1440px and 390px, in ID and EN.
- [ ] The editor matches `standalone.html#cms`: inline text editing, photo slots, item inspector, flyouts, phone/desktop toggle, preview, and draft → publish.
- [ ] A published news item appears on the home page and Media page without a deploy.
- [ ] Page text edited in the editor is not visible to visitors until Terbitkan is pressed.
- [ ] The editor is on its own domain, behind login, with roles. The public site has no edit surface.
- [ ] Seed data loaded, uploads resized, backups scheduled.
- [ ] A README explains how to run, deploy, add an editor user, and restore a backup, written for someone who isn't the original developer.

---

## 11. Build status and decisions (added 29 October 2026)

Sections 1 to 10 above are the original brief and are kept as written. This section records what was built
and where it differs. **`README.md` is the operating manual** (deploy, accounts, backups, troubleshooting).

### Against "Done means"

- Site matches the prototype: **yes.** Every page measured against `standalone.html` at 1440px and 390px in
  ID and EN, within 2px.
- Editor: **yes** (inline text, photo slots, item inspector, flyouts, phone/desktop, preview, draft → publish).
  Covered by `scripts/e2e-editor.mjs` (54 checks in Chrome, local database only).
- Published news appears without a deploy, and draft page text stays hidden until Terbitkan: **yes**, tested.
- Editor on its own domain, behind login, with roles; no edit surface on the public site: **yes**
  (`deploy/verify.sh` checks the split on every deploy).
- Seed data loaded and uploads resized: **yes.** Backups: the database is in IT's nightly backup; **the photo
  folder is not yet** (IT has been asked to add `/opt/mmi_website/uploads`).
- README: **yes.**

### Decisions that differ from the brief (deliberate)

- **One container, two hostnames**, not two apps: `src/proxy.ts` serves the site or the editor by Host
  header, following the VPS handover's pattern. The editor and its API return 404 on the public domain.
- **Hosting:** on the shared VPS with MMI's internal apps (the owner's decision, against section 2's advice),
  with isolation limits listed in README section 10. Database: its own role and database on the shared
  Postgres. Photos: a local folder, not S3.
- **English has its own URLs** (`/en/...`) so `hreflang` and per-language titles work; the toggle is a link
  and is remembered in a cookie.
- **Search engines are off until launch** (`SITE_INDEXABLE`), with noindex, a closed robots.txt and an empty
  sitemap.
- **Stricter than the prototype:** job links must be on JobStreet's own domains (section 8 policy), and
  contributors can never publish or change live items (enforced on the server).
- **Editor canvas is an iframe**, so the phone view uses the site's real media queries.

### Gotchas for whoever changes the code next

- Next.js 16: middleware is `src/proxy.ts`; read `node_modules/next/dist/docs/` (see `AGENTS.md`).
- The host-split rewrites need the server started with `HOSTNAME=0.0.0.0` (set in the Dockerfile and
  compose file). With another value every page 404s in production while dev looks fine.
- Next buffers request bodies through the proxy and silently cuts them at 10 MB, so `/api/media` is
  excluded from the proxy matcher and checks host and login itself.

### Still open (from section 9)

Social links are done (footer, `src/components/site/site-footer.tsx`). The "Draf" badges and the empty
company-history box were removed from About; the text itself is still waiting on management.

Vision, mission and values sign-off; company history paragraph; real contact and HR emails;
real photos; the ShalokalIndonesia article date; the 4 placeholder jobs; logo SVG and white version. Plus: a
"manage users" screen in the editor does not exist yet (accounts are managed on the server, README section 6).
