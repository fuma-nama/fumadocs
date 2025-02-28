---
'fumadocs-docgen': major
---

**Move `remarkTypeScriptToJavaScript` plugin to `fumadocs-docgen/remark-ts2js`.**

**why:** Fix existing problems with `oxc-transform`.

**migrate:**

Import it like:

```ts
import { remarkTypeScriptToJavaScript } from 'fumadocs-docgen/remark-ts2js';
```

instead of importing from `fumadocs-docgen`.