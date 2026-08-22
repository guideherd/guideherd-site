# guideherd-site

The public GuideHerd marketing website. Static, self-contained, and
independent of the GuideHerd product/application repository and its
backend.

## Build

```
bash scripts/build-site.sh        # writes ./_site
```

Cloudflare Pages: build command `bash scripts/build-site.sh`, output
directory `_site`.

## What is here

Marketing pages (`index.html`, `about.html`, `approach.html`,
`services.html`, `training.html`), the `404.html`, shared `assets/`, the
per-surface `_headers`, and the public **status page** (`status/`).

The status page reads a sanitized status artifact published by the
external monitor to the companion public repository
[`guideherd-status`](https://github.com/uasdj25/guideherd-status) — it
never contacts the GuideHerd backend, so it stays truthful during an
outage. Its `connect-src` is pinned to the artifact host alone.

No backend code, no application source, no credentials, no customer data.

## Search indexing

`docs/search-indexing.md` — the Search Console property, how it is verified,
the recorded decision on whether `/status/` is indexed, and the exact
remaining steps that need registrar or dashboard access.
