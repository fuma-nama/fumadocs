---
packages:
  'fumadocs-ui': patch
  '@fumadocs/base-ui': patch
---

### Add `block` TOC style

A TOC style without the track line: headings are indented by depth, and a block slides behind the active headings.

```tsx
<DocsPage tableOfContent={{ style: 'block' }} />
```
