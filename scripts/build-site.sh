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
cp index.html about.html approach.html services.html training.html 404.html "$OUT"/

# Crawler guidance: marketing pages and /status/ only — never app paths.
cp robots.txt sitemap.xml "$OUT"/

# Shared assets, product screenshots (fictional sample data only), and
# the public status page.
cp -R assets images status "$OUT"/

# Per-surface security headers (Cloudflare Pages reads _headers from the
# output directory).
cp _headers _redirects "$OUT"/

echo "built $OUT: $(find "$OUT" -type f | wc -l | tr -d ' ') files"
