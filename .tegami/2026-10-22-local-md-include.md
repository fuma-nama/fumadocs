---
packages:
  '@fumadocs/local-md': patch
  '@fumadocs/satteri': patch
---

### `<include>` in Local Markdown

[`<include>`](https://fumadocs.dev/docs/mdx/include) is enabled by default in `@fumadocs/local-md` and `@fumadocs/satteri/local-md`, and pages reload when the files they include change, with both the Vite and dev server watchers.

- `invalidateFile()` returns whether the source uses the file.
- Both require `fumadocs-core` 16.17.8.
