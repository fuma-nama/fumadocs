---
packages:
  '@fumadocs/satteri': patch
---

### Compile highlighted lines as HTML

- `rehypeCode()` and `rehypeCodeFromHighlighter()` accept `tokens: 'html'`, which compiles the tokens of a highlighted line to HTML instead of an element per token: compiled MDX is about half the size.
