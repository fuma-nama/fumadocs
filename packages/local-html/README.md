# Fumadocs Local HTML

The local HTML files content source for Fumadocs. It integrates plain `.html` files — exported decks, reports, agent-generated deliverables, pages from other tools — into a Fumadocs site, adapting them to the docs theme:

- content is scoped to the page's `<main>`/`<article>` (page chrome, scripts and styles are dropped),
- `class`/`style` attributes are removed by default so the docs prose styling takes over,
- headings get generated ids, powering the table of contents and search indexing,
- `<pre><code>` blocks are highlighted with Shiki, from the `language-*` class they carry,
- `<title>` and `<meta>` tags become the page's title/description (`fumadocs:title`, `fumadocs:description` and `fumadocs:icon` metas take precedence).

Trust model: content is transformed, not sanitized. Nothing that executes survives (e.g. `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>`, `<form>`), inline event handlers and `javascript:` URLs are always dropped, but the remaining markup is rendered as-is, and remote resources it references (images above all) are fetched by everyone who opens the page.

```ts
import { localHtml } from '@fumadocs/local-html';

const source = localHtml({ dir: 'content/pages' });
```

See [the documentation](https://fumadocs.dev/docs/integrations/content/local-html) for details.
