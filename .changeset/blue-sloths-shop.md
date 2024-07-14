---
'fumadocs-openapi': major
---

Move UI implementation from `fumadocs-ui` to `fumadocs-openapi`.

**why:** Allow a better organization of packages.

**migrate:**

This package is now Tailwind CSS only, you need to use it in conjunction with the official Tailwind CSS plugin.

Add the package to `content` under your Tailwind CSS configuration.

```js
import { createPreset, presets } from 'fumadocs-ui/tailwind-plugin';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './node_modules/fumadocs-ui/dist/**/*.js',
    './node_modules/fumadocs-openapi/dist/**/*.js',
  ],
  presets: [
    createPreset(),
  ],
};
```

Re-generate MDX files if needed.
