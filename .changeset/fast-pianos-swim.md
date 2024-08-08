---
'fumadocs-openapi': major
---

**Migrate to React Server Component**

The API reference page is now a server component.
The MDX generator will only generate a small MDX file, and the rest will be handled by our `APIPage` component. 

```mdx
---
title: Delete Api
full: true
method: POST
route: /v1/apis.deleteApi
---

<APIPage
  operations={[{ path: '/v1/apis.deleteApi', method: 'post' }]}
  hasHead={false}
/>
```

- Markdown/MDX content is still supported, but will be processed in the server component (during runtime) instead.
- Your Remark/Rehype plugins (e.g. Rehype Code) configured in Fumadocs MDX or other source providers, will **not** be shared. Fumadocs OpenAPI uses a separate MDX processor instance.
- `APIPage` component will fetch the OpenAPI Schema when being rendered. **On Vercel**, if it relies on the file system, ensure the page **will not** be re-rendered after build.

Please refer to documentation for the new usage.