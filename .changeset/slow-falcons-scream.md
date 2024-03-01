---
'fumadocs-core': major
'fumadocs-ui': major
---

**Move Typescript integrations to `fumadocs-typescript`**

why: It is now a stable feature

migrate: Use `fumadocs-typescript` instead.

```diff
- import { AutoTypeTable } from "fumadocs-ui/components/auto-type-table"
+ import { AutoTypeTable } from "fumadocs-typescript/ui"
```
