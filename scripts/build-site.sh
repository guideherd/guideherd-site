#!/usr/bin/env bash
# GuideHerd public marketing site build. Positive allowlist: a file
# ships because it is named here. Output defaults to _site (the
# Cloudflare Pages output directory).
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="${1:-_site}"
rm -rf "$OUT"
mkdir -p "$OUT"

# Marketing pages, and the 404 that keeps unknown paths from silently
# rendering the homepage with a 200.
cp index.html platform.html solutions.html how-it-works.html academy.html \
   resources.html company.html lets-talk.html 404.html "$OUT"/

# The published legal pages. Served at /privacy and /terms — Cloudflare Pages
# resolves the clean URL from the .html file, so no redirect rule is involved.
cp privacy.html terms.html trust.html "$OUT"/

# The redesign's runtime, required alongside the pages.
cp support.js "$OUT"/

# Crawler guidance: marketing pages and /status/ only — never app paths.
cp robots.txt sitemap.xml "$OUT"/

# Search-engine site-verification files, if any exist. These are opt-in by
# NAME rather than by pattern everywhere else in this script, but a
# verification file is the one case where the allowlist actively works
# against the owner: the provider hands you a file, tells you to put it at
# the site root, and gives no error if it 404s — verification just silently
# never completes. Matching the providers' fixed naming conventions removes
# that trap without loosening the allowlist to arbitrary files.
#   Google  google<token>.html      Bing  BingSiteAuth.xml
# Prefer DNS TXT verification where the registrar allows it: it survives a
# rebuild, a host change, and this script entirely. See
# docs/search-indexing.md.
shopt -s nullglob
for verification in google*.html BingSiteAuth.xml; do
  # nullglob drops a glob that matches nothing, but BingSiteAuth.xml is a
  # literal name, so it survives the loop whether or not it exists — hence
  # the explicit test rather than relying on the glob alone.
  [ -f "$verification" ] || continue
  cp "$verification" "$OUT"/
  echo "  shipped site-verification file: $verification"
done
shopt -u nullglob

# Root-level files that must be at the site ROOT to work at all:
# favicon.ico is requested from / by clients that ignore <link rel="icon">,
# and site.webmanifest is referenced from / by every page. assets/ ships
# wholesale below, so the sized PNGs need no line here — these two do, and
# an unlisted one is silently absent with no build error. That is the
# likeliest way this gets half-done (#354).
cp favicon.ico site.webmanifest "$OUT"/

# Shared assets, product screenshots (fictional sample data only), and
# the public status page.
cp -R assets images status "$OUT"/

# Per-surface security headers (Cloudflare Pages reads _headers from the
# output directory).
cp _headers _redirects "$OUT"/

echo "built $OUT: $(find "$OUT" -type f | wc -l | tr -d ' ') files"
