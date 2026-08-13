# Fumadocs Local HTML

The local HTML files content source for Fumadocs. It integrates plain `.html` files — exported decks, reports, agent-generated deliverables, pages from other tools — into a Fumadocs site, adapting them to the docs theme:

- content is scoped to `<main>`/`<article>` (page chrome, scripts and styles are dropped),
- `class`/`style` attributes are removed by default so the docs prose styling takes over,
- headings get generated ids, powering the table of contents and search indexing,
- `<title>` and `<meta>` tags become the page's title/description (`fumadocs:title`, `fumadocs:description` and `fumadocs:icon` metas take precedence).

Trust model: content is transformed, not sanitized. `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>` and inline event handlers are always dropped, but the remaining markup (links, images, attributes) is rendered as-is — treat the content directory like you treat your Markdown content: local files you trust.

```ts
import { localHtml } from '@fumadocs/local-html';

const source = localHtml({ dir: 'content/pages' });
```

See [the documentation](https://fumadocs.dev/docs/integrations/content/local-html) for details.
