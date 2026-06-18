---
packages: ['npm:fumadocs-ui', 'npm:@fumadocs/base-ui']
---

### Fix "Open in ChatGPT" page action URL

ChatGPT now uses the `prompt` query parameter (it redirects `q` to `prompt`), so the page action link is built as `https://chatgpt.com/?prompt=...&hints=search` to open reliably.
