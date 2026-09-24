---
packages:
  "fumadocs-ui": patch
---

### Announce copy button confirmation to screen readers

Copy controls (code block, copy markdown, heading anchor) now announce success or failure via a shared status region, and the code block's copy button no longer reports success when the clipboard write actually fails.
