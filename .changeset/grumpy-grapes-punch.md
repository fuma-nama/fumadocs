---
'fumadocs-openapi': major
---

**Redesign `createOpenAPI` usage**

1. Isolate API page and API server.

Before:

```ts
// lib/openapi.ts
import { createOpenAPI } from 'fumadocs-openapi/server';
import path from 'node:path';

export const openapi = createOpenAPI({
  input: [path.resolve('./scalar.yaml')],
  proxyUrl: '/api/proxy',

  mediaAdapters: { ... },
  shikiOptions: {
    themes: {
      dark: 'vesper',
      light: 'vitesse-light',
    },
  },
});
```

After:

```ts
// lib/openapi.ts
import { createOpenAPI } from 'fumadocs-openapi/server';
import path from 'node:path';

export const openapi = createOpenAPI({
  input: [path.resolve('./scalar.yaml')],
  proxyUrl: '/api/proxy',
});
```

```ts
// components/api-page.tsx
import { openapi } from '@/lib/openapi';
import { createAPIPage } from 'fumadocs-openapi/ui';

export const APIPage = createAPIPage(openapi, {
  mediaAdapters: { ... },
  shikiOptions: {
    themes: {
      dark: 'vesper',
      light: 'vitesse-light',
    },
  },
});
```

2. Remove `disablePlayground` from `createAPIPage()`, use `playground.enabled` instead:

```ts
// components/api-page.tsx
import { openapi } from '@/lib/openapi';
import { createAPIPage } from 'fumadocs-openapi/ui';

export const APIPage = createAPIPage(openapi, {
  playground: {
    enabled: false,
  }
});
```

3. Support client config:

```tsx
// components/api-page.tsx
import { openapi } from '@/lib/openapi';
import { createAPIPage } from 'fumadocs-openapi/ui';
import client from './api-page.client';

export const APIPage = createAPIPage(openapi, {
  client,
});
```

```tsx
// components/api-page.client.tsx
'use client';
import { defineClientConfig } from 'fumadocs-openapi/ui/client';

export default defineClientConfig({
  playground: {
    transformAuthInputs: (inputs) => [
      ...inputs,
      {
        fieldName: 'auth.tests',
        children: <div>Tests</div>,
        defaultValue: '',
      },
    ],
  },
});
```

4. Prefer client config for `adapter.client`:

Forwarding client-side adapters is also done with `api-page.client.tsx`:

```tsx
// components/api-page.tsx
import { openapi } from '@/lib/openapi';
import { createAPIPage } from 'fumadocs-openapi/ui';
import { adapters } from './my-media-adapters';
import client from './api-page.client';

export const APIPage = createAPIPage(openapi, {
  client,
  mediaAdapters: adapters,
});
```

```tsx
// components/api-page.client.tsx
'use client';
import { defineClientConfig } from 'fumadocs-openapi/ui/client';
import { adapters } from './my-media-adapters';

export default defineClientConfig({
  mediaAdapters: adapters,
});
```