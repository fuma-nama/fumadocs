---
'fumadocs-core': minor
---

Add `description` and `sections` options to `LLMsConfig` for customizing `llms.txt` output.

- `description` renders as a blockquote after the H1 title (per the [llms.txt spec](https://llmstxt.org/))
- `sections` is an array of `{ heading, content, position? }` inserted before or after the page tree

Use cases: site-specific prose like access patterns, license notes, contact info, and the spec-mandated description blockquote.

```ts
llms(source, {
  description: 'A knowledge base for humans and AI agents.',
  sections: [
    {
      heading: 'Access patterns',
      content: '- Send `Accept: text/markdown` to any URL',
    },
  ],
}).index();
```
