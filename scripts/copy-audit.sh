#!/usr/bin/env bash
# Throwaway copy-audit script for Task 6 (Section 3 reveal + CTA).
# Not shipped behavior -- run manually, not referenced by index.html.
set -euo pipefail

cd "$(dirname "$0")/.."

FILE="index.html"
PRE_REVEAL_TMP="$(mktemp)"
trap 'rm -f "$PRE_REVEAL_TMP"' EXIT

echo "== Check 1: em-dash across the whole file =="
grep -n "—" "$FILE" || echo "(no matches)"

echo
echo "== Check 2: concept/demo/showcase/קונספט before .section-reveal =="
awk '/<section class="section-reveal">/{exit} {print}' "$FILE" > "$PRE_REVEAL_TMP"
grep -niE "concept|קונספט|demo|showcase" "$PRE_REVEAL_TMP" || echo "(no matches)"
