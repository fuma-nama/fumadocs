---
'fumadocs-ui': major
---

**Change code block component usage**

**why:** The previous usage was confusing, some props are passed directly to `pre` while some are not.

**migrate:**

Pass all props to `CodeBlock` component.
This also includes class names, change your custom styles if necessary.

```tsx
import { Pre, CodeBlock } from 'fumadocs-ui/components/codeblock';

<MDX
  components={{
    // HTML `ref` attribute conflicts with `forwardRef`
    pre: ({ ref: _ref, ...props }) => (
      <CodeBlock {...props}>
        <Pre>{props.children}</Pre>
      </CodeBlock>
    ),
  }}
/>;
```

You can ignore this if you didn't customise the default `pre` element.