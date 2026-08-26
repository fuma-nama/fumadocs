---
packages:
  npm:@fumadocs/satteri: minor
---

## Slice Markdown output from the authored source

`remarkLlms` and the `stringify` mode of `remarkStructure` no longer re-stringify the document with `mdast-util-to-markdown`, they share a stringifier that slices the original source instead. On a 40 kB document with the default preset, `remarkLlms` went from 45 ms to 11 ms per compile, and structured data with `stringify` from 34 ms to 8 ms.

For `remarkLlms`, the output now matches the authored document: heading IDs are appended, frontmatter and ESM nodes are dropped, `remarkInclude` splices in the included content, and package-manager tabs, images and admonitions appear as written instead of their expanded `<Tabs>` / `<img>` / `<Callout>` forms. Heading levels also no longer lose their `#` markers.

For `remarkStructure`, content records keep the authored inline syntax, while links and JSX elements are flattened into their plain text. `stringify` now takes `true` or a `filterElement` callback for the elements whose syntax should be kept:

```ts
remarkStructureOptions: {
  stringify: {
    filterElement: (node) => node.name === 'TypeTable',
  },
},
```

Elements inserted by plugins (e.g. `remarkAutoTypeTable`) have no source to slice, kept ones are reconstructed from their attributes so they stay searchable.

The `mdast-util-to-markdown` based options of both plugins (`filterElement` variants returning `children-only`, `stringify` functions, `handlers`) are removed, along with the `mdast-util-gfm` and `mdast-util-mdx` dependencies. Use the plugins of `fumadocs-core` if you need custom stringification.
