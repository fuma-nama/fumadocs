---
packages:
  npm:fumadocs-core: patch
  npm:@fumadocs/satteri: minor
  npm:fumadocs-mdx: minor
---

## Remark LLMs: export a component with `output: "function"`

With `output: "function"`, `_markdown` becomes a component instead of a string: Markdown content is still stringified at compile time, while JSX elements stay as JSX, receiving their original props.

```ts
// fumadocs-mdx collection config
postprocess: {
  includeProcessedMarkdown: { output: 'function' },
},
```

Render it with `renderToMarkdown` from `fumadocs-core/server`. Elements resolve from `props.components`: a component can call `asMarkdown()` to output its own Markdown form, other components (including missing ones) are serialized as JSX syntax.

```tsx
import { renderToMarkdown } from 'fumadocs-core/server';

const { _markdown: Content } = await page.data.load();
const text = await renderToMarkdown(<Content components={getMDXComponents()} />);
```

`getText('processed')` keeps working: it renders the component for you, with an optional components map:

```ts
const text = await page.data.getText('processed', { components: getMDXComponents() });
```

Supported in bundler collections with both compilers, and in `dynamic: true` collections & `@fumadocs/satteri/local-md` with the Sätteri compiler.
