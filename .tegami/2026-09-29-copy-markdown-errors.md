---
packages:
  'fumadocs-ui': patch
  '@fumadocs/base-ui': patch
---

### Don't copy failed Markdown responses

`<MarkdownCopyButton />` copied the body of error responses, like a 404 page, and kept it cached until a full reload. Failed responses are rejected, and only successful ones are cached.

Fix [#3612](https://github.com/fuma-nama/fumadocs/issues/3612)
