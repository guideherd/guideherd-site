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
cp privacy.html terms.html "$OUT"/

# Superseded pre-redesign pages. Still reachable by URL so existing links
# and the truth-claim pins in test/ keep working; unlisted in sitemap.xml
# because the redesigned routes are canonical. Removed in the content pass.
cp about.html approach.html services.html training.html "$OUT"/

# The redesign's runtime, required alongside the pages.
cp support.js "$OUT"/

# Crawler guidance: marketing pages and /status/ only — never app paths.
cp robots.txt sitemap.xml "$OUT"/

# Shared assets, product screenshots (fictional sample data only), and
# the public status page.
cp -R assets images status "$OUT"/

# Per-surface security headers (Cloudflare Pages reads _headers from the
# output directory).
cp _headers _redirects "$OUT"/

echo "built $OUT: $(find "$OUT" -type f | wc -l | tr -d ' ') files"
