## @fumadocs/satteri@0.6.0

### Index tables by row

Structured data records each table row as a Markdown table of its header row and itself, instead of a record per cell. Type tables from `auto-type-table` record a row for each prop instead of the `TypeTable` element. Re-sync your search indexes to pick them up.

- `remarkStructure()` defaults `types` to `table` instead of `tableCell`.
- `tableRowToStructuredData()` from `fumadocs-core/search` creates the structured data of a table row, `typeTableToStructuredData()` from `fumadocs-typescript` of a type table.
- Search hooks group the rows of a table into a `table` item, `<SearchDialogList />` renders it with `Table`, `<SearchDialogListTable />` by default.
- Algolia and Orama Cloud link to the anchor of every record, like the props of type tables.
- Orama Cloud searches `title`, `section` and `content` by default, set `params.properties` to search other fields.
- `remarkStructure()` of Sätteri records the `data.structuredData` of nodes in place of the nodes.

### Markdown and search records from the authored source

`remarkLLMs()` and `remarkStructure()` of `fumadocs-core` slice their Markdown from the authored source like Sätteri, instead of stringifying the syntax tree. It is much faster, Markdown is no longer escaped or reformatted, and local images keep their addresses. Re-sync your search indexes to pick up the new records.

- Plugins record the Markdown of content they replace with `replaceSource()` or `embedSource()` from `fumadocs-core/mdx-plugins/stringifier`, in place of `data._stringify`, and add search records with `data.structuredData`. Nodes they insert otherwise are left out. A `namespace` limits an edit to the stringifiers of that namespace, like `search` for search records.
- Search records are always Markdown, also in Sätteri. `filterElement` replaces `stringify.filterElement`, it chooses the JSX elements kept as HTML tags (`File`, `TypeTable`, `Callout` and `Card` by default) that search dialogs render as components. Other elements and links are replaced by their content, images are removed, and an element on one line is recorded like a paragraph.
- Removed `defaultStringifier()` (use `createStringifier()`), `StringifyOptions`, `allowedMdxAttributes`, `filterMdxAttributes`, `placeholder()` (use `mdxAsPlaceholder`), and the `stringify` and `mdast-util-to-markdown` options of both plugins.
- Included content goes through the plugins like the document's own, Sätteri includes `.md` files as Markdown.
- `<auto-files>` shows its files in a code block, `auto-type-table` its props in a Markdown table, created by `typeTableToMarkdown()` from `fumadocs-typescript`.
- `remarkShow()` and `fileGenerator()` of `fumadocs-docgen` record their Markdown, generators receive the `file` to do the same.
- Records of `fumadocs-obsidian` resolve wikilinks, and leave comments, block IDs, callout markers and embeds out. Comments are removed before parsing, so they no longer split a paragraph.
- Pages of `fumadocs-python` compile from their MDX, so they have Markdown and search records.
- `fumadocs-mdx`, `fumadocs-docgen` and `fumadocs-obsidian` require `fumadocs-core` 16.17.0.

Fix [#3662](https://github.com/fuma-nama/fumadocs/issues/3662)

### Fix Markdown output and search records

- `remarkImage()` with `onError: 'hide'` removes the right images when a paragraph has several, and Sätteri removes them from the Markdown too.
- `files` code blocks of `remarkMdxFiles()` nest the entries under the last item of a folder (after `└──`), and trees indented with spaces only.
- The remark and rehype plugins no longer slow down quadratically on large documents, like `rehypeToc()` taking 17 ms instead of 239 ms on a 5 MB page.
- `fumadocs-epub` removes every unresolved image, the second of two adjacent ones was kept.
- Sätteri: headings with expression props, like `<Badge value={1} />` or local images, compile again, without these elements in their `toc` entry.
- Sätteri: `remarkStructure()` records every node type listed in `types`, like `fumadocs-core`. A blockquote is one search record instead of two. In the Markdown, includes and type tables stay inside their list item or blockquote, heading IDs no longer break setext and closed ATX headings, and nested replacements no longer duplicate the source after them.

## @fumadocs/satteri@0.5.1

### Mark packages side-effect free

All packages now declare `sideEffects` in `package.json`, so bundlers can tree-shake unused modules. Packages shipping stylesheets list them as side effects to keep CSS imports.

## @fumadocs/satteri@0.5.0

### Remark LLMs: export a component with `output: "function"`

With `output: "function"`, `_markdown` becomes a component instead of a string: Markdown content is still stringified at compile time, while JSX elements stay as JSX, receiving their original props.

```ts
// fumadocs-mdx collection config
postprocess: {
  includeProcessedMarkdown: { output: 'function' },
},
```

Render it with `renderToMarkdown` from `fumadocs-core/server`. Elements resolve from `props.components`: a component can call `asMarkdown()` to output its own Markdown form, other components (including missing ones) are serialized as JSX syntax.

```tsx
import { renderToMarkdown } from 'fumadocs-core/server';

const { _markdown: Content } = await page.data.load();
const text = await renderToMarkdown(<Content components={getMDXComponents()} />);
```

`getText('processed')` keeps working: it renders the component for you, with an optional components map:

```ts
const text = await page.data.getText('processed', { components: getMDXComponents() });
```

Supported in bundler collections with both compilers, and in `dynamic: true` collections & `@fumadocs/satteri/local-md` with the Sätteri compiler.

### Slice Markdown output from the authored source

`remarkLlms` and the `stringify` mode of `remarkStructure` no longer re-stringify the document with `mdast-util-to-markdown`, they share a stringifier that slices the original source instead. On a 40 kB document with the default preset, `remarkLlms` went from 45 ms to 11 ms per compile, and structured data with `stringify` from 34 ms to 8 ms.

For `remarkLlms`, the output now matches the authored document: heading IDs are appended, frontmatter and ESM nodes are dropped, `remarkInclude` splices in the included content, and package-manager tabs, images and admonitions appear as written instead of their expanded `<Tabs>` / `<img>` / `<Callout>` forms. Heading levels also no longer lose their `#` markers. Where generated content replaces the authored form, the output shows the generated content: `remarkAutoTypeTable` renders its type tables as Markdown tables, instead of the meaningless `<auto-type-table>` tag.

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

## @fumadocs/satteri@0.4.3

### Fix tab names that consist of a single JSX element

With `parseMdx` enabled, `remarkCodeTab` unwrapped a tab name that was entirely one JSX element and kept only its children, so icon-only names like `tab="<Home />"` rendered an empty trigger. Only paragraphs are unwrapped now, matching the behavior of `fumadocs-core`.

## @fumadocs/satteri@0.4.2

### Read structured data from `page.data.structuredData()`

Search indexing no longer falls back to `(await page.data.load()).structuredData`. Runtime content sources expose `structuredData()` on page data instead, sharing the compile with `load()`:

```ts
const structuredData = await page.data.structuredData();
```

The renderer returned by `load()` still carries `structuredData`, existing code keeps working.

## @fumadocs/satteri@0.4.0

### Sätteri 0.10

`@fumadocs/satteri` now requires `satteri` ^0.10.3, and the plugins were rewritten on its new capabilities:

- Exports (`frontmatter`, `toc`, `structuredData`, …) are emitted by an `after` document hook instead of an anchor marker appended to the source, so plugins no longer see (or need to skip) the anchor node.
- `remark-steps`, `remark-admonition` and `remark-code-tab` still detect their targets through node visitors (so documents without the construct cost nothing), but process each parent exactly once in an `after` hook, replacing the per-visit dedup workarounds.
- `remark-llms` stringifies the document root from a `before` hook instead of subscribing to 19 node types to find it.
- Markdown documents compile through Sätteri's own `markdownToJs`; the hand-assembled pipeline is gone. Raw HTML in `.md` files is still dropped, matching the previous behavior.
- `rehype-katex` parses KaTeX output with Sätteri's `htmlToHast`, dropping the `hast-util-from-html` dependency.
- No plugin reads `node.position`, so Sätteri now skips source-position tracking entirely (~15% faster parse).

**Breaking:** `ExtraPluginHooks.beforeToJs` was removed. Seed `ctx.data` from a Sätteri `before` hook on the plugin definition instead — it also receives the document root:

```ts
import { defineMdastPlugin } from 'satteri';

defineMdastPlugin({
  name: 'my-plugin',
  before(root, ctx) {
    ctx.data.myValue ??= [];
  },
});
```

## @fumadocs/satteri@0.3.2

### Introduce `@fumari/image-size`, replacing `image-size` in `remarkImage`

A fork of [probe-image-size](https://github.com/nodeca/probe-image-size) with no dependencies of its own.

```ts
import { probe, imageSize } from '@fumari/image-size';

await probe('./public/banner.png'); // { width: 1200, height: 630, type: 'png', mime: 'image/png' }
await probe('https://example.com/banner.png', { timeout: 5000 });

imageSize(bytes); // the same result, or `null`
```

`remarkImage` now uses it in both `fumadocs-core` and `@fumadocs/satteri`. Remote images are no longer downloaded in full just to be measured, and redirects are followed. Sizes are always in pixels, so an SVG sized in `em` or `pt` is converted instead of being skipped. Remote requests also time out after 30 seconds by default.

One behaviour difference worth knowing: the supported formats are avif/heic/heif, bmp, gif, ico, jpeg, png, psd, svg, tiff and webp. Sizes for jxl, tga, pnm, dds, icns, cur, ktx and jp2 can no longer be resolved and go through `onError` instead.

Sequential scanning stops after 512 KB, but that never loses an image: the one format that stores its dimensions past that point — TIFF with a trailing IFD — is resolved by following the header's pointer with a targeted read, using an HTTP `Range` request for remote files (and skipping through the body when the server ignores ranges).

## @fumadocs/satteri@0.3.0

### Support local file-system content source via Satteri

Use Satteri to load local MD/MDX files as content sources.

### Extract shared local content source logic to `@fumadocs/local-content`



### Fix math rendering

Use `katex` to render math by default.

## @fumadocs/satteri@0.2.0

### Default to Base UI

Internal packages & templates now use Base UI rather than Radix UI.
