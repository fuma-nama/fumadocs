---
'fumadocs-ui': major
---

**Rename `prefix` option on Tailwind CSS Plugin to `cssPrefix`**

**why:** The previous name was misleading

**migrate:** Rename the option.

```js
import { createPreset } from 'fumadocs-ui/tailwind-plugin';
 
/** @type {import('tailwindcss').Config} */
export default {
  presets: [createPreset({
      cssPrefix: 'fd'
  })],
};
```