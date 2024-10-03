---
'fumadocs-ui': major
---

**`DocsCategory` now accept `from` prop instead of `pages` prop.**

**why:** This allows sharing the order of items with page tree.
**migrate:**

The component now takes `from` prop which is the Source API object.

```tsx
import { source } from '@/lib/source';
import { DocsCategory } from 'fumadocs-ui/page';

const page = source.getPage(params.slug);

<DocsCategory page={page} from={source} />
```
