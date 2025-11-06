---
'fumadocs-openapi': major
---

**Drop `renderer` & `fields` API**

Fumadocs OpenAPI now expects per-feature customizations, dropping the old centralized `renderer` API.

```ts
// components/api-page.tsx
import { openapi } from '@/lib/openapi';
import { createAPIPage } from 'fumadocs-openapi/ui';

export const APIPage = createAPIPage(openapi, {
  // e.g. customise render functions
  content: {
    renderResponseTabs,
    renderAPIExampleLayout,
    renderAPIExampleUsageTabs,
  },
});
```

For migrating the `fields` option of Playground, you can use `render*` APIs on client configs.

```ts
// components/api-page.client.tsx
'use client';
import { defineClientConfig } from 'fumadocs-openapi/ui/client';

export default defineClientConfig({
  playground: {
    renderParameterField: (fieldName, field) => ...
  }
})
```

You can customise the renderers of different layouts:

```tsx
// components/api-page.tsx
import { openapi } from '@/lib/openapi';
import { createAPIPage } from 'fumadocs-openapi/ui';

export const APIPage = createAPIPage(openapi, {
  content: {
    renderResponseTabs: (tabs) => <div></div>,
    renderAPIExampleLayout: ({ selector, usageTabs, responseTabs }) => (
      <div></div>
    ),
    renderAPIExampleUsageTabs: (generators) => <div></div>,
    renderPageLayout: ({ operations, webhooks }) => <div></div>,
    renderOperationLayout: (slots) => <div></div>,
    renderWebhookLayout: ({
      header,
      authSchemes,
      paremeters,
      body,
      responses,
      callbacks,
    }) => <div></div>,
  },
});
```
