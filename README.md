# MMI website and editor

The public website of PT Merge Mining Industri (**MergeCoal**, <https://mergecoal.com>) and the editor
used to manage it (<https://cms.mmiinternal.online>).

This file is written for whoever looks after the site next, who may not be the person who built it.
You do not need to be a web developer for the everyday tasks in sections 6 to 8. Section 5 is for the
first deployment. If something is broken, go to section 11.

> `CLAUDE.md` is the original build brief (what the site and editor must do, the design rules and the
> content policy). `prototype/` is the clickable prototype the production site was built from.

### Current status (29 October 2026)

- **Deployed and running** on the VPS: <https://mergecoal.com> (with a Let's Encrypt certificate) and the
  editor at <https://cms.mmiinternal.online>. Two admin accounts exist.
- **Not launched yet:** `SITE_INDEXABLE=false`, so search engines are told to stay away, and the content is
  still the starter content (sample news, placeholder jobs, grey photo placeholders). See section 9.
- **DNS move:** `mergecoal.com` was moved from Hostinger's DNS to Cloudflare on 29 October 2026. Some local
  providers kept showing Hostinger's parking page for up to about 48 hours afterwards (see section 11).

---

## 1. What this is

One program, one container, two web addresses:

| Address | What it is | Who uses it |
|---|---|---|
| `mergecoal.com` (and `/en/...` for English) | The public site. Read-only. No login, no edit controls. | Everyone |
| `cms.mmiinternal.online` | The visual editor. Login required. | MMI staff with an editor account |

The program looks at which address the request came in on. On the public address it serves the website and
nothing else: the editor and its API simply do not exist there (they return 404). The editor address
shows the editor, not the website.

Both share one database (the shared Postgres on the VPS, database `mmi_website`) and one folder of
uploaded photos (`/opt/mmi_website/uploads`).

### How publishing works (useful to know when someone asks "why isn't my change live?")

- **Page text and the hero / team / About photos:** edits are saved automatically as a *draft*. Visitors
  do not see them until an Editor or Admin presses **Terbitkan**.
- **News and press articles:** have their own Draft / Publish buttons and go live immediately when published.
- **Gallery photos, videos and job openings:** go live as soon as they are saved as visible / open.
- **Contributors** can write drafts but cannot publish or change anything that is already live.

### Roles

| Role | Can do |
|---|---|
| Admin | Everything, including creating users (see section 6) |
| Editor | All content and publishing |
| Contributor | Create and edit drafts only |

## 2. The important facts in one place

| | |
|---|---|
| Public site | <https://mergecoal.com> (Indonesian), <https://mergecoal.com/en> (English) |
| Editor | <https://cms.mmiinternal.online> |
| Server | Hostinger VPS `76.13.19.246` (`srv1645064.hstgr.cloud`), shared with MMI's internal apps |
| App folder on the server | `/opt/mmi_website` |
| Container | `mmi_website_app` (listens on `127.0.0.1:3140` only; nginx is the way in) |
| Database | `mmi_website` on the shared Postgres, role `mmi_website_user` |
| Code | <https://github.com/gabrielrahardja1-star/mmi_website> (public; see section 10) |
| Domain | `mergecoal.com`, registered at Hostinger, **expires 2028-10-28** (see section 10) |
| DNS | Both `mergecoal.com` and `mmiinternal.online` are managed in Cloudflare (same account). Hostinger only holds the registration. |
| Certificates | `mergecoal.com`: Let's Encrypt via certbot, renews itself. `cms.mmiinternal.online`: the existing Cloudflare origin certificate shared by all `*.mmiinternal.online` apps. |
| Who runs the server | Calvin (IT) owns the shared nginx file and the VPS runbook |

## 3. How the code is organised

```
src/app/site/        the public pages (Indonesian at /, English under /en)
src/app/cms/         the editor: login, account page, the editor itself, and the canvas iframe
src/app/api/         the editor's API (content, page text, photo upload, login)
src/components/site/ the website components (shared by the public site and the editor canvas)
src/components/editor/ the editor: top bar, tools, inspector, canvas
src/db/              database tables (Drizzle)       drizzle/   the SQL migrations
src/proxy.ts         decides public site vs editor from the address (src/lib/host-routing.ts)
scripts/             one-off tools: migrate, seed, create-user, cleanup-media, e2e test
deploy/              nginx templates, deploy / backup / verify scripts, production .env template
data/                the starter content and the default page text (page-copy-defaults.json)
```

Stack: Next.js 16 (App Router), React 19, Postgres with Drizzle, Better Auth (login, roles, 2FA),
`sharp` (photo resizing). Nothing else to run: no separate API server, no queue.

## 4. Running it on your own computer

You need Node 22+ and a local Postgres.

```bash
cp .env.example .env            # then edit DATABASE_URL and AUTH_SECRET
createdb mmi_website_dev        # or any empty database named in DATABASE_URL
npm install
npm run db:migrate
npm run db:seed                 # sample news, articles and placeholder jobs
npm run user:create -- --email you@example.com --name "Your Name" --role admin
npm run dev
```

- Public site: <http://localhost:3000> and <http://localhost:3000/en>
- Editor: <http://cms.localhost:3000> (browsers treat `*.localhost` as your own computer)

Checks: `npm run typecheck`, `npm test`. `scripts/e2e-editor.mjs` drives the editor in Chrome; it **deletes
content**, so only run it against a local database (the file explains how).

## 5. First deployment on the VPS

These steps follow the VPS handover document. You need root SSH access to `76.13.19.246`.
**Do not touch** `procurement_clickhouse`, `/etc/nginx/conf.d/mmiinternal.conf`, the other databases
(`hauling_tracker`, `procurement`) or any other app's container. Check `/opt/postgres/SERVER.md` before
closing any firewall port.

The VPS has 8 GB of RAM and no swap, and other apps run on it. This container is capped at 1 GB.

### 5.1 DNS (two records at two places)

Both domains are managed in **Cloudflare**.

1. **`mergecoal.com`** (Cloudflare zone `mergecoal.com`): two `A` records, `@` and `www`, both to
   `76.13.19.246`, both **DNS only** (grey cloud). Keep them grey until the certificate in 5.8 exists.
   When the domain was first added to Cloudflare, Cloudflare copied Hostinger's old records (pointing
   at Hostinger's parking page, `2.57.91.91`) and set them to proxied. Those had to be corrected by hand.
2. **`cms.mmiinternal.online`** (Cloudflare zone `mmiinternal.online`): an `A` record named `cms` to
   `76.13.19.246`, **proxied (orange cloud)**, like the other `*.mmiinternal.online` records. It reuses
   the existing wildcard origin certificate.

**Check DNS the reliable way.** Some networks (the office one, for example) intercept or cache DNS, so
`dig` can show old answers. Ask Google's resolver over HTTPS instead, or use <https://dnschecker.org>:

```bash
curl -s 'https://dns.google/resolve?name=mergecoal.com&type=A'           # expect 76.13.19.246
curl -s 'https://dns.google/resolve?name=cms.mmiinternal.online&type=A'  # expect Cloudflare addresses
```

**Changing a domain's nameservers is slow; changing a record is not.** After moving `mergecoal.com` to
Cloudflare's nameservers, some providers kept the old answer for up to about 48 hours. From now on, record
changes inside Cloudflare take minutes.

### 5.2 Database

On the VPS:

```bash
cd /opt/postgres
scripts/add-app.sh mmi_website_user '<a long password, letters and digits only>' mmi_website
```

Make the password with `openssl rand -hex 24`. Letters and digits only, so it is safe inside the
connection URL.

### 5.3 Code

```bash
mkdir -p /opt/mmi_website && cd /opt/mmi_website
git clone https://github.com/gabrielrahardja1-star/mmi_website.git .
```

The repository is public, so no key is needed. If it is ever made private, `git pull` on the server stops
working until the server has a read-only *deploy key*: run `ssh-keygen -t ed25519` on the server, add the
public key in GitHub under the repository's Settings, Deploy keys (leave "write" off), and switch the
remote to the `git@github.com:...` address (`git remote set-url origin ...`).

### 5.4 Configuration

```bash
cp deploy/env.production.example .env
chmod 600 .env
nano .env        # fill in DATABASE_URL (password from 5.2) and AUTH_SECRET (openssl rand -base64 32)
```

Tip: generate the secrets into shell variables and insert them with `sed`, so they never appear on screen:
`PGPW=$(openssl rand -hex 24); AUTHSECRET=$(openssl rand -base64 32)`, run `add-app.sh` with `"$PGPW"`, then
`sed -i "s|:CHANGE_ME@|:${PGPW}@|; s|^AUTH_SECRET=.*|AUTH_SECRET=${AUTHSECRET}|" .env`.

Leave `SITE_INDEXABLE=false`. Check the port is free: `ss -ltnp | grep 3140`. If something uses it,
pick another and change `APP_PORT` in `.env` **and** both nginx files (5.7).

### 5.5 Build, database tables, first admin

```bash
mkdir -p uploads && chown 1000:1000 uploads
docker compose --profile tools build
docker compose run --rm tools npm run db:migrate
docker compose run --rm tools npm run db:seed
docker compose run --rm tools npm run user:create -- --email <you@mmi> --name "<Name>" --role admin
docker compose up -d --build
```

`user:create` asks for the password twice and does not show it. The seed loads the sample news and press
articles, and **placeholder job openings** (their titles end in "(contoh)"): replace them before launch.

### 5.6 Check the container

```bash
docker compose ps                       # app should say "healthy"
curl -s http://127.0.0.1:3140/api/health
```

### 5.7 nginx

Give this app its own files. Do not edit IT's shared one.

```bash
cp deploy/nginx/mmi_website-site.conf /etc/nginx/conf.d/
cp deploy/nginx/mmi_website-cms.conf  /etc/nginx/conf.d/
```

Open `mmi_website-cms.conf` and follow the `REPLACE` note: use the same `ssl_certificate` and
`ssl_certificate_key` lines as the vhosts in `/etc/nginx/conf.d/mmiinternal.conf` (the files in
`/etc/nginx/ssl/`), so the editor uses the same certificate. Then test before reloading; a reload is
graceful and does not interrupt the other apps:

```bash
nginx -t && systemctl reload nginx
```

### 5.8 Certificate for the public domain

Only once `mergecoal.com` and `www.mergecoal.com` both resolve to the VPS:

```bash
certbot --nginx -d mergecoal.com -d www.mergecoal.com --redirect
nginx -t && systemctl reload nginx
certbot renew --cert-name mergecoal.com --dry-run      # rehearses the automatic renewal
```

certbot **rewrites** `/etc/nginx/conf.d/mmi_website-site.conf` (adds HTTPS and the redirect). After this,
never copy the template over it again: edit the live file. Renewal is automatic (the same certbot serves
the other domains on this server). The first certificate was issued on 29 October 2026.

Optional, later: you can switch the `mergecoal.com` records to proxied (orange cloud). If you do, set
Cloudflare's **SSL/TLS mode for that zone to Full (strict)** first. "Flexible" causes an endless redirect.

### 5.9 Verify

```bash
deploy/verify.sh
curl -I https://mergecoal.com
curl -I https://cms.mmiinternal.online
```

`verify.sh` runs about twenty checks: every page answers, the editor and its API are NOT reachable from
`mergecoal.com`, unknown addresses are refused, and so on. All lines should say `ok`.
Run it without `BASE` (it then talks to the container directly). With `BASE=https://mergecoal.com` it
skips the unknown-host checks, because through nginx an unknown hostname is answered by nginx's default
vhost, which belongs to another app and is outside this app's control.

### 5.10 Tell Calvin (not optional)

The master runbook `/opt/postgres/SERVER.md` is not in git and is not updated automatically. A previous
app was deployed and never added, and the gap went unnoticed for weeks. Send Calvin this:

> Please add **mmi_website** to /opt/postgres/SERVER.md.
> App: MMI website + editor. Domains: mergecoal.com (and www), cms.mmiinternal.online.
> Container: mmi_website_app (internal port 3140, one container serves both domains).
> Database: mmi_website (role mmi_website_user) on mmi-postgres (already covered by backup-all.sh).
> Photos: /opt/mmi_website/uploads (NOT in the database; please add this folder to the nightly backup).
> Folder: /opt/mmi_website.
> nginx: /etc/nginx/conf.d/mmi_website-site.conf and mmi_website-cms.conf.

## 6. Everyday tasks

All of these are run on the VPS in `/opt/mmi_website`.

**Add an editor** (Admin, Editor or Contributor):

```bash
docker compose run --rm tools npm run user:create -- --email ani@mmi.co.id --name "Ani" --role editor
```

Roles: `admin`, `editor`, `contributor`. Give them the editor address and the password privately. Ask them
to open **Akun** (the person icon, top right), change the password and turn on two-factor login.
**Keluar** (top right) logs out.

**See who has an account:**

```bash
docker exec mmi-postgres psql -U postgres -d mmi_website -c 'select email, name, role, two_factor_enabled, created_at from "user" order by created_at'
```

**Remove an account** (for example when someone leaves). Their login and sessions are deleted; the content
they wrote stays, it just no longer records them as the last editor:

```bash
docker exec mmi-postgres psql -U postgres -d mmi_website -c "delete from \"user\" where email = 'ani@mmi.co.id'"
```

Always keep at least one Admin account that belongs to someone who is staying.

**Someone forgot their password:**

```bash
docker compose run --rm tools npm run user:create -- --email ani@mmi.co.id --reset-password
```

**Update the site** after code changes on GitHub:

```bash
deploy/deploy.sh
```

It pulls, rebuilds, applies database changes, restarts and runs the checks. If the checks fail, read
section 11 and `docker compose logs --tail 100 app`. It is safe to run again if it was interrupted.

If your SSH connection tends to drop, start it so that a disconnect cannot stop it:

```bash
nohup deploy/deploy.sh > /tmp/mmi_deploy.log 2>&1 &
tail -f /tmp/mmi_deploy.log        # Ctrl+C stops watching, not the deploy
```

**Look at the logs / restart:**

```bash
docker compose logs -f --tail 100 app
docker compose restart app
```

**Clean up photos nobody uses** (uploaded but never attached to anything; safe to run now and then):

```bash
docker compose run --rm tools npm run media:cleanup -- --dry-run     # preview
docker compose run --rm tools npm run media:cleanup                  # do it
```

It only removes photos older than 24 hours that no news item, gallery entry or page photo uses.

## 7. Backups

**The database is covered by the server's nightly backup.** IT's backup job dumps *every database* in the
shared Postgres (including `mmi_website`, automatically) and copies the result off the server.

**The uploaded photos are not.** They are files in `/opt/mmi_website/uploads`, not rows in the database, and
the nightly job only knows about the apps it was told about. **Ask IT to add `/opt/mmi_website/uploads`
to the nightly backup** (the same way another app's uploaded images are already handled). Until that is done,
the photos exist only on this server.

`deploy/backup.sh` is an extra, self-contained backup of both the database and the photos into
`/opt/mmi_website/backups` (keeping the newest 14 of each). It is useful as a stop-gap for the photos
and before risky changes. Test it by hand:

```bash
deploy/backup.sh
ls -lh backups
```

Optionally schedule it (`crontab -e`):

```
17 2 * * *  /opt/mmi_website/deploy/backup.sh >> /opt/mmi_website/backups/backup.log 2>&1
```

A backup on the same disk does not survive that disk failing, so the off-server copy made by IT's job
is the one that matters.

### Restoring

Use the most recent files in `backups/` (replace the dates):

```bash
cd /opt/mmi_website
docker compose stop app

# database (the password and name are in DATABASE_URL in .env)
gunzip -c backups/db-20261029-021700.sql.gz | docker exec -i -e PGPASSWORD='<password>' mmi-postgres \
  psql -U mmi_website_user -d mmi_website

# photos
tar xzf backups/uploads-20261029-021700.tar.gz        # recreates ./uploads
chown -R 1000:1000 uploads

docker compose start app
deploy/verify.sh
```

The dump drops and recreates this app's own tables only. To test a restore safely, do it into a spare
database first.

## 8. Settings (`/opt/mmi_website/.env`)

After changing `.env`, apply it with `docker compose up -d`.

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | Connection to the shared Postgres. Host is `postgres` (the container name on the shared network). |
| `PUBLIC_HOST`, `PUBLIC_ORIGIN` | The public domain, `mergecoal.com` and `https://mergecoal.com`. |
| `CMS_HOST`, `CMS_ORIGIN` | The editor, `cms.mmiinternal.online` and `https://cms.mmiinternal.online`. |
| `AUTH_SECRET` | Signs editor sessions. Changing it logs everyone out. Keep it secret. |
| `UPLOAD_DIR` | Where photos are stored in the container (`/app/uploads`). |
| `SITE_INDEXABLE` | `false` keeps the site out of Google. `true` at launch. See section 9. |
| `APP_PORT` | Port on the VPS that nginx forwards to. Must match the nginx files. |

## 9. Before launch

Work through this list. Until `SITE_INDEXABLE` is `true`, search engines are told not to list the site
(a `noindex` header and tag, a `robots.txt` that closes the site, and an empty sitemap).

- [ ] **Replace the placeholders** (the brief lists them as open items):
  - contact email in the footer and the HR email in the recruitment scam notice (edit them in the editor);
  - real photos for the hero, team and About slots, and original, text-free photos for news posts;
  - **the 4 sample job openings**: close or replace them (their titles end in "(contoh)");
  - the Vision, Mission and Core Values need management sign-off (their "Draf" badges were removed from
    the site on 29 October 2026), and the company history paragraph in About (removed from the page until
    the text arrives) is still waiting on management;
  - confirm the date of the ShalokalIndonesia press article;
  - the official logo as SVG, and a white version.
- [ ] Read the content rules in section 12.
- [ ] In the editor, click through every page in Indonesian and English, and in the phone view.
- [ ] Turn on two-factor for the Admin and Editor accounts.
- [ ] Confirm backups work (section 7) and a restore has been tried once.
- [ ] Tell Calvin (5.10) if not done.
- [ ] Turn on **auto-renewal** for the domains in Hostinger (section 10).
- [ ] Check the site opens on a phone on mobile data (not only on the office network) before announcing it.
- [ ] **Launch:** set `SITE_INDEXABLE=true` in `.env`, run `docker compose up -d`, then run
      `deploy/verify.sh`: its last line should say search engines are ALLOWED. Submit
      `https://mergecoal.com/sitemap.xml` in Google Search Console.

**Keeping the site private while it is built.** `noindex` stops Google listing the site, but anyone with
the link can still open it. For real privacy, `deploy/nginx/mmi_website-site.conf` has a commented-out
password block (`auth_basic`). Uncomment it, remove it again at launch.

## 10. Handover notes (read this if the original developer has left)

- **Domain renewal.** On 29 October 2026 auto-renewal was **off** for all three MMI domains in Hostinger:

  | Domain | Expires | What stops working if it lapses |
  |---|---|---|
  | `mmiinternal.online` | **2027-10-01** | All internal apps (hauling, HR, procurement, MiniMart, tracker) and this editor |
  | `mmiminimarketbackend.online` | 2027-05-15 | The MiniMart backend |
  | `mergecoal.com` | 2028-10-28 | The public website |

  Turn auto-renewal on (with a company payment method), or put the dates in a shared calendar.
- **Whose accounts?** Make sure the Hostinger account (domain and VPS), the Cloudflare account and the GitHub
  repository belong to the company, not to one person's login. The repository is currently under a
  personal GitHub account and is **public**: transfer it to a company GitHub organisation (repository
  Settings, Transfer) and update the `git remote` on the server (`git remote set-url origin <new url>`).
  Being public, it shows the server's address and setup; it contains no passwords or keys.
- **Who can add editors?** Anyone with root SSH to the VPS, using section 6. There is no "manage users"
  screen in the editor yet. Before the original developer leaves (31 December 2026), remove their
  personal admin account (section 6) and make sure another Admin belongs to someone who stays.
- **The shared VPS.** This was deliberately placed on the same server as MMI's internal apps and their
  data. The site runs in its own container, on its own network, with its own database role that can only
  reach its own database, and nothing public listens except nginx. That limits the risk but does not
  remove it: a serious flaw in the public site or the server itself could in principle reach internal data.
  In particular, every container on the shared database network can reach the others at the network level
  (the database role limits only protect Postgres, not the other services on that network).
  Keep the server and the container image updated, and revisit hosting it separately if you ever can.
- **Updating dependencies.** After upgrading Next.js, run `deploy/verify.sh` (see section 11, first item).

## 11. If something is wrong

| Symptom | Likely cause and fix |
|---|---|
| **Every page on mergecoal.com is a 404**, but `/api/health` works | The app was started with a `HOSTNAME` other than `0.0.0.0`, or after a Next.js upgrade. Check `HOSTNAME: 0.0.0.0` in `docker-compose.yml` and the `Dockerfile`, then `deploy/verify.sh`. |
| Nginx shows 502 Bad Gateway | The container is not running or `APP_PORT` does not match nginx. `docker compose ps`, `docker compose logs --tail 100 app`. |
| App will not start: "Invalid or missing environment variables" | A value is missing in `.env`. The message names it. See `deploy/env.production.example`. |
| Photo upload fails with "too large" / 413 | The editor's nginx file is missing `client_max_body_size 25m;`. |
| Editor shows the login page again and again | `AUTH_SECRET` changed, or the browser blocks cookies for `cms.mmiinternal.online`. Also check the clock on the server. |
| "Terlalu banyak percobaan" when logging in | The login limit is 5 tries per 5 minutes. Wait five minutes. |
| The site is not in Google after launch | `SITE_INDEXABLE` must be `true` (section 9); `verify.sh` shows which state it is in. Indexing takes days. |
| The editor canvas is blank | Open the browser console. Usually the app was updated while the editor was open: reload the page. |
| Visitors see Hostinger's "Registered at Hostinger" page | Their DNS provider still remembers the time before the move to Cloudflare. It clears by itself (at most about 48 hours after a nameserver change). Check worldwide at <https://dnschecker.org/#A/mergecoal.com>. Editing records in Hostinger does nothing while the nameservers are Cloudflare's, and switching the nameservers back would restart the wait. |
| Browser says `DNS_PROBE_FINISHED_NXDOMAIN` | The name does not exist in DNS (yet). Check the record in Cloudflare. A newly added record can still look missing for up to 30 minutes where the "does not exist" answer was cached; in Chrome, clear `chrome://net-internals/#dns`, or turn on Settings, Security, "Use secure DNS". |
| `dig` shows old answers or times out on the office network | That network interferes with DNS. Use `curl -s 'https://dns.google/resolve?name=<name>&type=A'` instead (section 5.1). |
| `docker compose` cannot find network `postgres_net` | The shared Postgres stack is not running. Start it from `/opt/postgres` (ask Calvin). |
| Database errors after an update | Run `docker compose run --rm tools npm run db:migrate`. |

## 12. Content rules (from the brief; do not break these)

- **No names** of staff, managers or leadership anywhere on the site.
- **No business figures:** no production volumes, reserves, buyers, prices or contract details.
- **Location stays vague:** "Kecamatan Sungai Pinang, Kalimantan Selatan". No map, no Jakarta office address.
- **Jobs link to JobStreet only.** The editor refuses other links. The recruitment scam notice must say MMI
  never charges recruitment fees and only posts on this site and its official JobStreet page.
- **Press page:** headline, outlet, date and our own one-line summary. Never copy article text.
- **Photos:** anyone shown must be wearing correct PPE, and staff must have agreed to appear.
- No religious holiday greetings in the news feed.
- **Design:** keep the existing look. Single light theme, brand blue, Archivo and IBM Plex Sans, 3px
  corners, the angled corner only on the three places it is used, no emoji, no em dashes in copy.
