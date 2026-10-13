# HUSH

A single-page concept microsite for a premium headphone brand that does not exist. Built as a BOOST ME capability showcase, in the same spirit as the [מאמא מיה scrolltelling tour](https://brr7.short.gy/boostme-mamma-mia). See [boost-me.digital](https://boost-me.digital) for the real thing.

**Live:** https://wenjygal.github.io/hush-concept/

**Preview locally:** serve the folder over HTTP, don't open `index.html` directly via `file://` — the browser blocks the ES module imports (CORS) when the page loads from the filesystem. Any static server works, e.g. `python3 -m http.server`, then visit `http://localhost:8000`.

**Tests:** `npm test` runs the test suite (`node --test`).
