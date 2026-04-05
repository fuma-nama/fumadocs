---
'fumadocs-core': minor
---

Add a `transform` option to `LLMsConfig` for post-processing the generated `llms.txt` output.

The callback receives the default auto-generated content and the render context, and returns the final string. Useful for injecting the description blockquote mandated by the [llms.txt spec](https://llmstxt.org/), custom sections, or any other site-specific content.

```ts
llms(source, {
  transform: (output) =>
    output.replace(
      /^# (.+)\n/m,
      '# $1\n\n> A knowledge base for humans and AI agents.\n',
    ),
}).index();
```
