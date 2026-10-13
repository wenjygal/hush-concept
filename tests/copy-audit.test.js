// tests/copy-audit.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

test("index.html has no em-dash characters anywhere", () => {
  const matches = html.match(/—/g) || [];
  assert.equal(matches.length, 0, `found ${matches.length} em-dash character(s) in index.html`);
});

test("index.html has no twist-leaking words/phrases before the reveal section", () => {
  // Scoped to visible body copy, not <head>: the real og:url meta tag (added for
  // link previews) necessarily contains "concept" as part of the live site's actual
  // URL (https://wenjygal.github.io/hush-concept/), which is infrastructure, not
  // marketing copy, and is not what this check guards against.
  const bodyIndex = html.search(/<body/i);
  const revealIndex = html.search(/<section class="section-reveal"/i);
  assert.ok(bodyIndex > -1, "could not find the <body> opening tag in index.html");
  assert.ok(revealIndex > -1, "could not find the <section class=\"section-reveal\" opening tag in index.html");

  const preReveal = html.slice(bodyIndex, revealIndex);
  const leakPatterns = [/concept/i, /קונספט/, /demo/i, /showcase/i, /boost\s*me/i];

  for (const pattern of leakPatterns) {
    const found = preReveal.match(pattern);
    assert.equal(found, null, `found twist-leaking text "${found}" before .section-reveal (pattern: ${pattern})`);
  }
});
