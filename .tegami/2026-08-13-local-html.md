---
packages:
  npm:@fumadocs/local-html:
    type: minor
---

## New package: `@fumadocs/local-html`

A content source for local HTML files. It integrates externally-produced HTML pages (exported decks, reports, agent-generated deliverables) into a Fumadocs site, adapting them to the docs theme: content is scoped to `<main>`/`<article>`, page chrome and scripts/styles are dropped, `class`/`style` attributes are removed so prose styling takes over, and headings get generated ids for TOC and search indexing.
