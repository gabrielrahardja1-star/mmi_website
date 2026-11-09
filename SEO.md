# Google and search: status and next steps

Last updated 9 November 2026. For how to run and deploy the site, see `README.md`.

## Where things stand

- **The site is on Google.** On 9 November a `site:mergecoal.com` search showed the home page and Tentang Kami
  with the right titles, descriptions and logo icon. The other pages and story pages should follow over the next
  week or two.
- **Search engines are allowed in.** `SITE_INDEXABLE=true` is set in `/opt/mmi_website/.env` on the server
  (since 5 November 2026). With `false`, the site tells Google to stay out.
- **Google Search Console is set up** for `mergecoal.com`. Ownership is proven with a TXT record in Cloudflare
  DNS. **Do not delete that TXT record**, or Search Console access is lost.
- **Sitemap:** `https://mergecoal.com/sitemap.xml`, submitted in Search Console. It lists every page in both
  languages, plus every published news story, and updates itself.

## What the site already does for search

- Real addresses for each page, Indonesian at `/...` and English at `/en/...`, linked with `hreflang`.
- A title and description for each page in both languages, plus a share image for social media previews.
- Each published news story has its own page (`/berita/<title>-<id>`) with its full text ("Isi lengkap" in the
  editor). Editing a title keeps old links working.
- Structured data (company details and news articles), so Google understands what each page is.
- Photo alt text from captions, a favicon from the logo, and a 404 page.

There is nothing more to build in the code for now. What matters from here is content and links.

## What helps, in order

1. **Put `https://mergecoal.com` in every official profile:** Instagram bio, LinkedIn company page, Facebook
   page, JobStreet company profile. This is the quickest way for Google to find the site and trust it.
2. **Publish our own stories regularly.** Each news item becomes a page Google can list. Write a short full text
   ("Isi lengkap") for each, in Indonesian and English. One or two a month is plenty. Follow the content rules
   in `README.md` section 12 (no names, no business figures, PPE in every photo).
3. **Get real links from other sites.** Ask local government or village pages, partners, and outlets that write
   about MMI to link to `mergecoal.com`. One link from a real news site is worth more than anything else here.
4. **Share new stories on social media** when they go live, with the link to the story page.

## What does not help

- **Asking people to keep opening the link.** Google does not rank pages by visit counts. It only makes the
  site's visitor numbers misleading.
- **Copying other outlets' articles onto the site.** Google treats copied text as low value, and it breaks the
  press policy. This is why the Artikel page was removed.
- **Requesting indexing for every page again and again.** Once per page is enough. Google decides the timing.

## How to check progress

- **Search Console → Indexing → Pages:** how many pages Google has indexed, and why any are left out.
- **Search Console → Performance:** which searches show the site, and how often people click.
- **Search Console → Sitemaps:** should say "Success". If it says "Couldn't fetch" for more than a few days,
  remove it and add `sitemap.xml` again.
- **Google search `site:mergecoal.com`:** a quick look at what is listed.

To ask Google to look at a new or changed page: Search Console → URL inspection → paste the full address →
"Test live URL" → "Request indexing".

## Things we can't control

Searches for the company name also show other sites (Global Energy Monitor, EMIS, Petromindo, Indonesia Miner).
Some of them quote old production and buyer figures. We can't remove those. A site with regular stories and
real links will usually rank above them over time.

## To do

- [x] Add the site link to Instagram, Facebook, TikTok and YouTube (done 9 November 2026).
- [ ] Add the site link to the LinkedIn company page and the JobStreet company profile.
- [ ] Request indexing for `/media`, `/karir` and two or three story pages.
- [ ] Check the Pages report around 16 November and again around 23 November.
- [ ] Write stories for the remaining Instagram posts and Media Kit activities (posyandu, mosque support,
      Rantau Nangka PKK shop, child support, maternal and child health, tree planting, community meeting).
- [ ] **Before 31 December 2026:** add an MMI-owned Google account as an **Owner** in Search Console
      (Settings → Users and permissions), so access doesn't leave with the current owner.
