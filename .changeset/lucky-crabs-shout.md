---
'fumadocs-ui': major
---

### Migrate to Tailwind CSS v4

**migrate:**

Follow https://tailwindcss.com/blog/tailwindcss-v4 for official migrate guide of Tailwind CSS v4.

Fumadocs UI v15 redesigned the Tailwind CSS config to fully adhere the new config style, no JavaScript and options needed for plugins.
Add the following to your CSS file:

```css
@import 'tailwindcss';
@import 'fumadocs-ui/css/neutral.css';
@import 'fumadocs-ui/css/preset.css';
/* if you have Twoslash enabled */
@import 'fumadocs-twoslash/twoslash.css';

@source '../node_modules/fumadocs-ui/dist/**/*.js';
/* if you have OpenAPI enabled */
@source '../node_modules/fumadocs-openapi/dist/**/*.js';
```

The `fumadocs-ui/css/preset.css` import is required, it declares necessary plugins & styles for Fumadocs UI, and `fumadocs-ui/css/neutral.css` defines the color palette of UI.

Like the previous `preset` option in Tailwind CSS plugin, you can import other color presets like `fumadocs-ui/css/vitepress.css`.

You should also pay attention to `@source`, the file paths are relative to the CSS file itself. For your project, it might not be `../node_modules/fumadocs-ui/dist/**/*.js`.