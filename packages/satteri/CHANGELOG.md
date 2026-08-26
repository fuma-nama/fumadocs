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
