---
'next-docs-ui': minor
---

**Support theme presets**

Add theme presets for the Tailwind CSS plugin, the default and ocean presets are available now.

```ts
const { docsUi, docsUiPlugins } = require('next-docs-ui/tailwind-plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
  plugins: [
    ...docsUiPlugins,
    docsUi({
      preset: 'ocean',
    }),
  ],
};
```