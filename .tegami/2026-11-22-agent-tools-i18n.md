---
packages:
  'fumadocs-core': patch
  '@fumadocs/cli': patch
  'fumadocs-ui': patch
---

### Agent tools and i18n fixes

- MCP `get_page` accepts the `.md` paths linked by `llms.txt`.
- `defineI18n()` output can be passed from Server Components to client components again.
- `zhCN()` and other language presets translate the 404 page and mobile menu label of Radix UI layouts.
- CLI: the MCP route builds its search index once, not on every search.
- CLI: the WebMCP `read_page` tool reads search results with a heading hash, and Strict Mode no longer logs unhandled `AbortError`s.
