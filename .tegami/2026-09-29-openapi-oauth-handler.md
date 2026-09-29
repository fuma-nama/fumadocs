---
packages:
  'fumadocs-openapi': minor
---

### Add `createOAuthHandler()`

A route handler to use as the single OAuth redirect URI of API playgrounds, instead of registering every page. Pass its URL to `createOpenAPIPage({ oauthRedirectUrl })`.

```ts title="app/api/oauth/route.ts"
import { openapi } from '@/lib/openapi';

export const GET = openapi.createOAuthHandler();
```

Fix [#3611](https://github.com/fuma-nama/fumadocs/issues/3611)
