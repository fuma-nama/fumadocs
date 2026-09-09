---
packages:
  npm:fumadocs-core: patch
---

## `llms()` renders pages

`llms()` used to build the `llms.txt` index only, turning a page into Markdown was left to your own `getLLMText()`. Pass `renderPage` and it covers both:

```ts
import { llms } from 'fumadocs-core/source';

export const docsLlms = llms(source, {
  renderPage: async (page) => `# ${page.data.title} (${page.url})

${await page.data.getText('processed')}`,
});
```

- `page(page)` renders one page, for the per-page Markdown route.
- `full(lang?)` renders every page and joins them, for `llms-full.txt`.

```ts
// app/llms-full.txt/route.ts
export const GET = async () => new Response(await docsLlms.full());
```

Both methods exist only when `renderPage` is given, in types and at runtime. Fumadocs cannot know how your content source exposes Markdown: `page.data.getText('processed')` on Fumadocs MDX, `page.data.content` on `@fumadocs/local-md`.
