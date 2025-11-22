---
'fumadocs-ui': minor
---

**Require importing page layout according to your docs layout:**

```ts
// for docs layout
import { DocsPage } from 'fumadocs-ui/layouts/docs/page';

// for notebook layout
import { DocsPage } from 'fumadocs-ui/layouts/notebook/page';
```

The default `fumadocs-ui/page` will redirect to `fumadocs-ui/layouts/docs/page`, if you're on Notebook layout, please update the import.
