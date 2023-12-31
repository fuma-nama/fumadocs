---
'next-docs-mdx': major
---

**Prefer `.map.ts` instead of `_map.ts`**

Unless you have especially configured, now it uses `.map.ts` by default.

```diff
- import map from "@/_map"
+ import map from "@/.map"
```