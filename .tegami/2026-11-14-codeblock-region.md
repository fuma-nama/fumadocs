---
packages:
  'fumadocs-ui': patch
  '@fumadocs/base-ui': patch
---

### Code Blocks are No Longer Region Landmarks

- The scroll area of `CodeBlock` stays focusable but no longer has `role="region"` without a name, so pages with several code blocks no longer repeat unnamed region landmarks.
