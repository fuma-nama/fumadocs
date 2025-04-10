---
'fumadocs-openapi': major
---

**Move `APIPage` to `fumadocs-openapi/ui`**

migrate:

in your `mdx-components.tsx` (or where you pass MDX components):

```tsx
import defaultComponents from 'fumadocs-ui/mdx';
import { APIPage } from 'fumadocs-openapi/ui';
import { openapi } from '@/lib/source';
import type { MDXComponents } from 'mdx/types';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
    return {
        ...defaultComponents,
        // use this instead
        APIPage: (props) => <APIPage {...openapi.getAPIPageProps(props)} />,
        ...components,
    };
}
```

why: Next.js compiles the same module in different layers: route handlers, pages (which include browser bundle), and middleware (Edge Runtime). It avoids compiling React components of `fumadocs-openapi` twice when you reference the OpenAPI server in a route handler.
