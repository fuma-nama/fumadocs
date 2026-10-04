---
packages:
  '@fumadocs/base-ui': patch
---

### Fix Spacious layout on Firefox mobile

When scrolling in Firefox, the top edge of the page panel moved away from the navbar and table of contents bar, ending up in the middle of the page or off screen. It now stays below the bars, without relying on CSS anchor positioning.
