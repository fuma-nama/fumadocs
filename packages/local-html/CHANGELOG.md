## @fumadocs/local-html@0.1.0

### New package: `@fumadocs/local-html`

A content source for local HTML files. It integrates externally-produced HTML pages (exported decks, reports, agent-generated deliverables) into a Fumadocs site, adapting them to the docs theme: content is scoped to `<main>`/`<article>`, page chrome and scripts/styles are dropped, `class`/`style` attributes are removed so prose styling takes over, and headings get generated ids for TOC and search indexing.

Code blocks are highlighted with Shiki, configured through `rehypeCodeOptions` like `@fumadocs/local-md` (`false` to skip it). The language comes from the block's `language-*` class, which now survives `adaptStyles`.

Hot reload works like `@fumadocs/local-md`: `@fumadocs/local-html/dev/vite` for Vite, or the bundled `local-html dev` server with `@fumadocs/local-html/dev/ws` for everything else.
