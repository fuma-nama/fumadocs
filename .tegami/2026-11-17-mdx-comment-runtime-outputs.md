---
packages:
  'fumadocs-core': patch
  '@fumadocs/satteri': patch
---

### Fix authored code in outputs rendered at runtime

- MDX comments containing `<`, like `{/* <author@example.com> */}`, no longer fail to compile.
- A heading with a component in an expression, like `## Use {<Badge>new</Badge>}`, no longer throws when rendering.
- Member tags in expressions, like `{<Tabs.Tab />}`, render in Markdown and search like other components.
- Sätteri: a component with an object attribute in a heading, like `<Badge style={{ color: 'red' }}>`, compiles, and an object expression in a heading shows in the TOC title.
