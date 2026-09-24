---
packages:
  'fumadocs-ui': patch
  '@fumadocs/base-ui': patch
  '@fumadocs/language': patch
---

### Announce copy confirmation to screen readers

Copy buttons are polite live regions whose label switches to "Copied" after a successful copy, so screen readers announce it. The code block's copy button no longer reports success when the clipboard write fails.
