---
'fumadocs-ui': major
---

**Move `keepCodeBlockBackground` option to code block component**

**why:** Easier to customise code block styles.

**migrate:**

Enable `keepBackground` on `<CodeBlock />`, and remove deprecated usage.

```tsx
import { Pre, CodeBlock } from 'fumadocs-ui/components/codeblock';
 
<MDX
  components={{
    pre: ({ ref: _ref, ...props }) => (
      <CodeBlock keepBackground {...props}>
        <Pre>{props.children}</Pre>
      </CodeBlock>
    ),
  }}
/>;
```
