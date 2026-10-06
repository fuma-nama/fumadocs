---
packages:
  npm:fumadocs-core: patch
---

## Highlight search matches inside inline code

`highlightMarkdown()` didn't mark matches inside backticks:

```ts
createContentHighlighter('register').highlightMarkdown('call `register` and register');
// before: call `register` and <mark>register</mark>
// after:  call <code><mark>register</mark></code> and <mark>register</mark>
```

A code span with a match becomes a `<code>` element, with its text escaped. A code span with no match stays as it was.
