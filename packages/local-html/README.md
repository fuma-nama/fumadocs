# Fumadocs Local HTML

The local HTML files content source for Fumadocs. It integrates plain `.html` files — exported decks, reports, agent-generated deliverables, pages from other tools — into a Fumadocs site, adapting them to the docs theme:

- content is scoped to `<main>`/`<article>` (page chrome, scripts and styles are dropped),
- `class`/`style` attributes are removed by default so the docs prose styling takes over,
- headings get generated ids, powering the table of contents and search indexing,
- `<title>` and `<meta>` tags become the page's title/description (`fumadocs:title`, `fumadocs:description` and `fumadocs:icon` metas take precedence).

```ts
import { localHtml } from '@fumadocs/local-html';

const source = localHtml({ dir: 'content/pages' });
```

See [the documentation](https://fumadocs.dev) for details.
