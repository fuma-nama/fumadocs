---
packages:
  npm:fumadocs-core: patch
---

## Fix `filterElement` being ignored by `remarkLLMs`

`remarkLLMs` wrote its own `filterElement` over yours, so the option did nothing:

```ts
remarkLLMs({
  // never ran
  filterElement: (node) => node.name !== 'Callout',
});
```

Your function now runs for every node except `mdxjsEsm`, which stays excluded either way.

Fumadocs MDX passes this option through `postprocess.includeProcessedMarkdown`.
