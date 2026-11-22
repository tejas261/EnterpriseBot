#!/usr/bin/env bash
# Produces ipl-live.zip excluding dependencies, build output, local env files and secrets.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT="${1:-$ROOT/ipl-live.zip}"
cd "$ROOT"

if ! command -v zip >/dev/null 2>&1; then
  echo "zip is not installed. Install it or create the archive manually." >&2
  exit 1
fi

rm -f "$OUTPUT"
zip -r "$OUTPUT" . \
  -x "node_modules/*" \
     "*/node_modules/*" \
     ".next/*" \
     "*/\.next/*" \
     ".git/*" \
     ".env" \
     ".env.local" \
     ".env.*.local" \
     "coverage/*" \
     "test-results/*" \
     "playwright-report/*" \
     "*.zip" \
     "*.log" \
     "*.tsbuildinfo" \
     "*/\.tsbuildinfo"

echo "created $OUTPUT"
