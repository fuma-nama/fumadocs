---
'fumadocs-twoslash': major
'fumadocs-ui': major
---

**Move Twoslash UI components to `fumadocs-twoslash`**

**why:** Isolate logic from Fumadocs UI

**migrate:** 

Before:

```ts
import "fumadocs-ui/twoslash.css"

import { Popup } from "fumadocs-ui/twoslash/popup"
```

After:

```ts
import "fumadocs-twoslash/twoslash.css"

import { Popup } from "fumadocs-twoslash/ui"
```

**Tailwind CSS is now required for Twoslash integration.**
