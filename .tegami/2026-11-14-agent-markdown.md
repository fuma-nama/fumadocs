---
packages:
  'fumadocs-core': patch
  'fumadocs-typescript': patch
---

### Files for agents

- `llms()` adds `files()` and `serve(path)`: `llms.txt`, `llms-full.txt` and `<page>.md` files by their public path, served from one route.
- URL directories get their own `llms-full.txt`, listed in `llms.txt`, so large docs can be read section by section.
- `llms.txt` from `serve()` links pages to their Markdown.
- The `filter` option leaves pages out of `full()` and the files.
- Components without a Markdown form keep their MDX tag name in processed Markdown, also in production builds.
- The `get_page` MCP tool accepts URLs with a hash or query, like the URLs of search results.
- Auto type tables show the full type of each prop in Markdown.
