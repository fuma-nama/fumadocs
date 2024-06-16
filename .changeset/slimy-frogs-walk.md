---
'fumadocs-core': minor
'fumadocs-ui': minor
---

**Pass the `icon` prop to code blocks as HTML instead of MDX attribute.**

**why:** Only MDX flow elements support attributes with JSX value, like:

```mdx
<Pre icon={<svg />}>...</Pre>
```

As Shiki outputs hast elements, we have to convert the output of Shiki to a MDX flow element so that we can pass the `icon` property.

Now, `rehype-code` passes a HTML string instead of JSX, and render it with `dangerouslySetInnerHTML`:

```mdx
<Pre icon="<svg />">...</Pre>
```

**migrate:** Not needed, it should work seamlessly.
