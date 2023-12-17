---
'next-docs-ui': minor
---

**Support `Layout` for non-docs pages (without page tree)**

Same as Docs Layout but doesn't include a sidebar. It can be used outside of the docs, a page tree is not required.

```jsx
import { Layout } from 'next-docs-ui/layout';

export default function HomeLayout({ children }) {
  return <Layout>{children}</Layout>;
}
```

**`nav.items` prop is deprecated**

It is now replaced by `links`.