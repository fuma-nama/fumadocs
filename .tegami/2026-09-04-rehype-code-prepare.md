---
packages:
  npm:fumadocs-core: patch
---

## Async `_fd_prepare` hook for Shiki transformers

`rehype-code` awaits `transformer._fd_prepare(code, options)` on every transformer before highlighting a code block. Transformers can run async work (or coalesce work across the code blocks being highlighted concurrently) and serve it from the synchronous Shiki hooks afterwards.
