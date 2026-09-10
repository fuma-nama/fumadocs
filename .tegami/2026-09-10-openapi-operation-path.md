---
packages:
  npm:fumadocs-openapi: patch
---

## `path` in operation renderers

`renderOperationLayout` and `generateCodeSamples` now receive the operation's `path`, so custom layouts no longer need a React context to reach it:

```tsx
renderOperationLayout: (slots, { path, method }) => (
  <div>
    {slots.header}
    <EndpointPreview path={path} method={method} />
    {slots.description}
    {slots.apiPlayground}
  </div>
);
```
