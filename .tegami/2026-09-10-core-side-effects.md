---
packages:
  npm:fumadocs-core: patch
---

## Marked as side-effect free

`fumadocs-core` now declares `"sideEffects": false`. No module in the package imports for side effects or ships CSS, so bundlers that rely on the hint (webpack in particular) can drop unused modules instead of keeping them alive:

```ts
import { createGetUrl } from 'fumadocs-core/source';
```
