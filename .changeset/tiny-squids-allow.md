---
'fumadocs-ui': major
---

**Add `fd-` prefix to all Fumadocs UI colors, animations and utilities**

**why:** The added Tailwind CSS colors may conflict with the existing colors of codebases.

**migrate:** Enable `addGlobalColors` on Tailwind CSS Plugin or add the `fd-` prefix to class names.

```js
import { createPreset } from 'fumadocs-ui/tailwind-plugin';
 
/** @type {import('tailwindcss').Config} */
export default {
  presets: [createPreset({
      addGlobalColors: true
  })],
};
```
