# Search indexing — guideherd.ai

What is automated, what is decided, and the exact steps that still need a
person with dashboard access. GitLab #353.

The repository half of this is done and tested. The Search Console half is
dashboard work: it cannot be executed from CI, and it must not be left in one
person's browser with nothing written down — which is what this file is for.

## Property

| | |
|---|---|
| Site | `https://guideherd.ai` |
| Recommended property type | **Domain property** (`guideherd.ai`) |
| Sitemap | `https://guideherd.ai/sitemap.xml` |
| Registrar / DNS host | **still not recorded in any repository** — verification completed without it being written down; record it at the next registrar visit (vendor register is the right home) |

A **Domain property** covers every subdomain and both schemes in one place,
so `app.guideherd.ai` and `training.guideherd.ai` are visible from the same
console as the marketing site. A URL-prefix property would cover only
`https://guideherd.ai/` and would need separate properties for the others.

## Verification

**Prefer DNS TXT.** It survives a rebuild, a hosting change, and this
repository entirely, and it is the only method that satisfies a Domain
property. An HTML file is tied to whatever the build happens to ship.

If an HTML file is used anyway, `scripts/build-site.sh` now ships it: any
`google*.html` at the repository root, and `BingSiteAuth.xml`, are copied to
the site root. This closes a real trap — the build is a *positive allowlist*,
so an unlisted file is silently absent, and Search Console reports no error
when its verification file 404s. Verification simply never completes, with
nothing anywhere saying why. `test/indexability.test.js` pins that support.

Recorded outcome:

| Field | Value |
|---|---|
| Method used | **Not file-based** — verified by elimination: no `google*.html` exists in the repository or the build output, and a file-based verification would have silently failed, which it did not. DNS TXT or Google-account-level verification; the owner should note the exact mechanism here on the next dashboard visit so a future re-verification knows where to look. |
| Verified on | 2026-08-22 |
| Verified by | DJ (owner-executed, dashboard) |

## Owner

| Role | Who |
|---|---|
| Property owner | **DJ** (`uasdj25`) |
| Where to check | Google Search Console → the `guideherd.ai` property → Pages, and Sitemaps |
| Cadence | Review Coverage after any routing change, and whenever a page is added to or removed from `sitemap.xml` |

Add a second owner when there is a second person. A property with one owner
is an account-recovery problem, not just a bus factor.

## Decision: /status/ is indexed

**Decided, not defaulted** — #353 requires this be explicit.

`/status/` **is** advertised for indexing. It is public, stable, linked from
every page footer, and it is precisely what someone searches for during an
incident: a status page that cannot be found in search fails at the one
moment it exists for. It carries no customer data and no claim the rest of
the site does not already make.

The alternative — keeping it out of the index so an outage never surfaces in
search results — optimises for appearance over the reader, and the page's
whole design (independently hosted, no backend dependency, closed status
vocabulary) exists so that it stays useful when things are wrong.

To reverse: remove `/status/` from `sitemap.xml`, drop it from `INDEXABLE` in
`test/indexability.test.js` and `test/robots-sitemap.test.js`, and add
`<meta name="robots" content="noindex, follow">` to `status/index.html`. The
tests will tell you if you do half of it.

## What is already true (verified, not assumed)

- **11 routes** advertised in `sitemap.xml`, each returning **200** live.
- Every one declares its own clean URL as `rel="canonical"` (#350).
- `robots.txt` allows the site and advertises the sitemap; it carries no
  stale `Disallow` rules (#351).
- No page in the sitemap suppresses its own indexing, and `_headers` sets no
  site-wide `X-Robots-Tag` — a header would override every meta tag on the
  site while remaining invisible in the HTML.
- `404.html` is `noindex` and is not advertised.
- Crawlers and unfurlers are served, not blocked. Verified against the live
  edge on 2026-08-22: **Googlebot, Bingbot, Google-InspectionTool,
  facebookexternalhit, Twitterbot, LinkedInBot, Slackbot, WhatsApp** — all
  `200` for both a page and the share image. A generic `Python-urllib` agent
  gets `403`; that is Cloudflare's scripted-agent filtering and affects no
  real crawler.

## Remaining manual steps

**Completed 2026-08-22 (owner-executed, dashboard evidence):**

1. ~~Create the Search Console property~~ — **done**; the property for
   `guideherd.ai` is active.
2. ~~Verify it~~ — **done**; see the *Verification* table. One loose end
   carried deliberately: the registrar / DNS host is still unrecorded in any
   repository. That no longer blocks anything here — record it at the next
   registrar visit.
3. ~~Submit `sitemap.xml`~~ — **done**; submitted and reporting success.
4. ~~Review Coverage once~~ — **done**, with the numbers agreeing exactly:
   Google reports **12 discovered pages**, and `sitemap.xml` advertises
   exactly **12 routes** — so discovery matches the intended list and **no
   unexpected route** (including the four superseded pages) has been
   discovered. URL Inspection for `https://guideherd.ai/`: *URL is on
   Google*, *page is indexed*, *HTTPS valid*. Full per-route indexing of the
   remaining discovered pages is Google's own crawl cadence, not an action —
   check the Pages report on the review cadence above rather than treating
   time-in-queue as a defect.
5. ~~Record the outcome~~ — this revision is that record.

**What remains is routine, not setup:** review Coverage after any routing
change or sitemap edit (the cadence in *Owner* above), and if a superseded
page ever appears in the index, that is input to **#352** — not a reason to
issue a removal request, which is hard to undo.

