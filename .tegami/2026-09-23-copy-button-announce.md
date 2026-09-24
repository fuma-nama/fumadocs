---
packages:
  'fumadocs-ui': patch
  '@fumadocs/base-ui': patch
---

### Announce copy button confirmation to screen readers

Copy controls (code block, copy markdown, heading anchor, accordion anchor) now announce a "Copied to clipboard" confirmation to screen readers via a visually-hidden status label next to each button.
In `fumadocs-ui`, the code block's copy button also announces failures, and no longer reports success when the clipboard write actually fails.
