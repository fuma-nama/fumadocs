---
packages:
  'fumadocs-preview': patch
---

### Deduplicate Waku in preview bundle

- Deduplicate `waku`, `react` and `react-dom` in the preview build to prevent duplicate router context instances (#3783).
