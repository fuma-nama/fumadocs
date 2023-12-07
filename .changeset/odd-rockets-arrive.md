---
'next-docs-ui': major
---

**Support Tailwind CSS plugin usage**

If you are using Tailwind CSS for your docs, it's now recommended to use the official plugin instead.

```js
const { docsUi, docsUiPlugins } = require('next-docs-ui/tailwind-plugin')

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './content/**/*.mdx',
    './node_modules/next-docs-ui/dist/**/*.js'
  ],
  plugins: [...docsUiPlugins, docsUi]
}
```

The `docsUi` plugin adds necessary utilities & colors, and `docsUiPlugins` are its dependency plugins which should not be missing.