---
'fumadocs-ui': major
---

**Change usage of Code Block component**

The inner `pre` element is now separated from code block container, making it easier to customise.`

Before:

```tsx
import { CodeBlock, Pre } from 'fumadocs-ui/mdx/pre';

<Pre title={title} allowCopy {...props} />
```

After:

```tsx
import { CodeBlock, Pre } from 'fumadocs-ui/mdx/pre';

<CodeBlock title={title} allowCopy>
  <Pre {...props} />
</CodeBlock>
```


