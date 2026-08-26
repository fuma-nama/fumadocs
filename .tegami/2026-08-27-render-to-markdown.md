---
packages:
  npm:fumadocs-core: patch
---

## `fumadocs-core/server`: render React trees into Markdown

The Markdown renderer of Fumapress is now part of Fumadocs core. `renderToMarkdown()` converts RSC output into Markdown, and calling `asMarkdown()` is how a server component opts in with its own Markdown form:

```tsx
import { asMarkdown, md, renderToMarkdown } from 'fumadocs-core/server';

async function Callout({ title, children }) {
  if (asMarkdown()) return md.linePrefix('> ')`**${title}**\n${children}`;

  return <div className="callout">...</div>;
}

const text = await renderToMarkdown(
  <Callout title="Note">
    <p>Hello</p>
  </Callout>,
);
// > **Note**
// >
// > Hello
```

Components that never call `asMarkdown()` are kept as JSX syntax with their serializable props, so are client components, which never run on the server. Host elements returned by an opted-in component are converted with a built-in HTML to Markdown table.

`renderRoute()` renders a page element only when its component opts in, for giving arbitrary routes a Markdown version. In the browser the module resolves to a stub where `asMarkdown()` is always `false`.
