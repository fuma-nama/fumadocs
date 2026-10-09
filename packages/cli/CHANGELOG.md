## @fumadocs/cli@1.7.5

### OG images in every template

- The TanStack Start, TanStack Start SPA and React Router SPA templates generate OG images of docs pages with Takumi.
- `--og-image next-og` warns on templates other than Next.js, instead of being ignored silently.
- The `og` feature tells you how to prerender the images in SPA mode.

## @fumadocs/cli@1.7.4

### Search hooks for each provider

`fumadocs-core/search/client` exports a hook for each search client, like `useFetchSearch()`. They return the props of `<SearchDialog />`:

```tsx
const search = useFetchSearch({ locale });

<SearchDialog {...search} {...props}>
  <SearchDialogList />
</SearchDialog>;
```

`data` is the last successful search, its `items` have their content parsed into `hastContent`. `error` is set when the last search failed.

- `experimental_useSearch()` creates a search hook from a memoized search function.
- `useDocsSearch()` is deprecated.
- `useFlexsearchStatic()` and `useOramaCloudLegacySearch()` are exported from the paths of their clients.
- `<SearchDialogList />` shows `defaultItems` without results.
- `useSearchList()` is removed, `useSearch()` returns `getActive()`, `setActive()` and `subscribeActive()` for the active item.
- `<SearchDialogListItem />` renders a `div` instead of a `button`, table rows render their cells only.
- `renderMarkdown` of `<SearchDialogListItem />` renders `content` instead of `hastContent`. Without it, the string content of custom items is shown as text.
- The templates of Fumadocs CLI and Create Fumadocs App use the new hooks.

### Sync Mixedbread stores with `sync()`

- `sync()` and `toDocuments()` from `fumadocs-core/search/mixedbread` upload a file for each page, whose chunks are its title, headings and paragraphs. Results link to their headings and render tables like other search integrations.
- Stores synced with `mxbai store sync` need a re-sync, the frontmatter of pages is no longer read.
- Tag filters match the tags of pages, `locale` filters results by language, and the `limit` of requests can only lower `topK`.
- The Mixedbread template of Fumadocs CLI syncs a pre-rendered `static.json` with `sync()`, debounces searches by 300 ms, and reads the API key from `MXBAI_API_KEY`.

## @fumadocs/cli@1.7.3

### New package: `@fumadocs/ai-chat`

The Ask AI chat for AI SDK: pass the result of `useChat()` to `AIChatProvider`, then render `AIChatPanel` in the `aiChat` option of docs layouts. Questions rest at the top while answers stream below, and Markdown is rendered block by block, so unclosed syntax never shows.

The `ai/*` components of the CLI install its source along with the integration, and the generated layout uses `AIChat`, `AIChatPanel`, `AIChatTrigger` and `useAIChat`.

## @fumadocs/cli@1.7.2

### Place AI chat in layouts

Docs, Notebook, and Glass layouts accept an `aiChat` option, pass your chat as `aiChat.panel` and the layout places it beside the page on wide viewports, and floats it over the page on smaller ones.

Your chat component no longer needs layout-specific positioning, like targeting `#nd-docs-layout` or overriding `--fd-right-width`.

The `ai` feature of Fumadocs CLI now renders your docs layout from a client component at `ai/layout.tsx` in your components directory, which passes the installed chat to `aiChat`. It supports Docs, Notebook, Glass, and Spacious layouts, and only adds a floating trigger to the layouts without their own.

### Introduce Spacious Layout

A less compact version of Docs Layout, the page sits in an inset panel beside the sidebar, with page-level actions at the top of the panel.

- Use it from `fumadocs-ui/layouts/spacious` and `fumadocs-ui/layouts/spacious/page`, and import the styles from `fumadocs-ui/css/generated/spacious.css`.
- Pass `aiChat.panel` to render your AI chat in the layout, docked beside the page on wide screens and floating over it on smaller ones.
- Customize it with `npx @fumadocs/cli customize`, only available for Base UI.

The Chinese presets of `@fumadocs/language` include translations for its new strings.

## @fumadocs/cli@1.7.1

### Meilisearch integration

Search your docs with [Meilisearch](https://www.meilisearch.com), self-hosted or on Meilisearch Cloud.

- `toDocuments()` and `sync()` from `fumadocs-core/search/meilisearch` export your pages and replace the documents of an index, old documents stay searchable until the new ones are indexed.
- `meilisearchClient()` from `fumadocs-core/search/client/meilisearch` searches from the browser with `useDocsSearch()`, filtered by tag and locale.

```tsx
const client = new Meilisearch({ host, apiKey: searchKey });

useDocsSearch({
  client: meilisearchClient({ client, indexName: 'docs', locale }),
});
```

Set it up with `npx @fumadocs/cli feature search --provider meilisearch`, or choose it in `create-fumadocs-app`.

Fix [#3627](https://github.com/fuma-nama/fumadocs/issues/3627)

### Simpler search sync setup

- `feature search` writes the path of the pre-rendered `static.json` into `scripts/sync-content.ts`, and the `build` script runs it without arguments.
- On TanStack Start, the path follows the Nitro output: `.output/public`, `.vercel/output/static` with the `vercel` preset, or `dist/client` without Nitro.
- Typesense documents are built in the `static.json` route, without a separate `lib/export-search-indexes.ts`.

## @fumadocs/cli@1.7.0

### New registry format

The CLI is upgraded to Fuma CLI 0.3, the registry is now a manifest with the raw files instead of one JSON per component.

- Installing fetches every needed file in parallel, and no longer parses the installed files to link their imports.
- Layouts are imported from `fumadocs-ui` unless you have installed them, without a Fumadocs-specific plugin.

Older versions of the CLI cannot read the new registry, upgrade to install components.

### Moved files

Some components are installed to a location that follows their source, update your imports if you install them again:

| Before                                                                          | Now                                             |
| ------------------------------------------------------------------------------- | ----------------------------------------------- |
| `components/sanity/<name>.tsx`                                                  | `components/sanity/<name>.component.tsx`        |
| `components/docs-sidebar/tabs-dropdown.tsx`                                     | `components/docs-sidebar/tabs/dropdown.tsx`     |
| `components/openapi/playground/{result-display,server-select,oauth-dialog}.tsx` | `components/openapi/playground/components/*`    |
| `components/graphql/playground/code-editor.tsx`                                 | `components/graphql/components/code-editor.tsx` |

### Names of layout slots

Slots are named after their path, like `layouts/docs/slots/sidebar` instead of `slots/docs/sidebar`. `fumadocs customise` is unchanged.

## @fumadocs/cli@1.6.2

### Shorter names for integration components

The components of integrations dropped their `fumadocs/` prefix:

```npm
npx @fumadocs/cli add openapi/page
```

| Before                | Now          |
| --------------------- | ------------ |
| `fumadocs/openapi/*`  | `openapi/*`  |
| `fumadocs/asyncapi/*` | `asyncapi/*` |
| `fumadocs/graphql/*`  | `graphql/*`  |
| `fumadocs/story/*`    | `story/*`    |
| `fumadocs/sanity/*`   | `sanity/*`   |
| `fumadocs/api-docs/*` | `api-docs/*` |

The old names are gone, update the commands in your scripts. `fumadocs/base-ui` and `fumadocs/radix-ui` are unchanged, the CLI resolves them from your configured `uiLibrary`.

## @fumadocs/cli@1.6.1

### Reuse your Shadcn UI components

On projects with a `components.json`, the CLI leaves the `button`, `popover` and `collapsible` of your `ui` directory as they are and imports them from installed components, they share the API of Shadcn UI. `cn` is imported from your `utils` alias instead of a new `lib/cn.ts`, configurable in `cli.json`:

```json
{
  "aliases": {
    "utils": "./lib/utils"
  }
}
```

Fumadocs' copies are only installed when you don't have them yet. The `tabs` and `accordion` primitives are Fumadocs specific, they are installed next to their components instead of the `ui` directory.

- `customize` updates the imports of your route files to the installed layouts.
- `feature ai` and `feature feedback` install the primitives of your configured `uiLibrary`, they always used the Radix UI ones before.

### Mark packages side-effect free

All packages now declare `sideEffects` in `package.json`, so bundlers can tree-shake unused modules. Packages shipping stylesheets list them as side effects to keep CSS imports.

## @fumadocs/cli@1.6.0

### `init` and `feature` commands

The CLI now configures Fumadocs on an existing app and adds features to it, beyond installing UI components. Supported on Next.js, React Router, TanStack Start and Waku.

```bash
npx @fumadocs/cli init
npx @fumadocs/cli feature llms
```

`init` adds the docs pages in a dedicated route group (e.g. `app/(docs)`) with their own provider, layout and search route, so your existing setup stays untouched: it only registers the Fumadocs MDX plugin in your bundler config, imports the styles into your global CSS and adds `suppressHydrationWarning` to `<html>`. Pass `--i18n` to set up internationalization with locale-prefixed routes.

`feature <id>` installs the components and routes of a feature and wires them into your app: `ai` (Ask AI dialog), `llms` (`llms.txt`, `llms-full.txt` and per-page Markdown, with the `/docs/*.md` rewrite on Next.js), `mcp`, `webmcp` (experimental), `og`, `search` (Orama Cloud, Algolia, Typesense, Mixedbread), `feedback`, `epub` and `lint`. Features follow your setup: the `baseUrl` of your docs, `src/` directory, i18n, static export and SPA modes, Fumadocs MDX with the macro API or `source.config.ts`. Route URLs are read from the constants of `lib/shared.ts` (`docsRoute`, `docsContentRoute`, `docsImageRoute`), and route features add URL helpers like `getPageMarkdownUrl(page)` to `lib/source.ts`.

Every command takes `-y` to skip prompts and `--no-install` to only write dependencies to `package.json`.

Components are installed at the directories of your shadcn `components.json` by default, so the same component isn't duplicated in two places. `export epub` no longer scaffolds the export route, run `feature epub` instead.

### CLIs on `cac`

The CLIs are now built on [cac](https://github.com/cacjs/cac).

## @fumadocs/cli@1.5.0

### Add API Playground & Schema UI components

Install the UI of API integrations into your codebase:

```npm
npx @fumadocs/cli add fumadocs/openapi/playground
npx @fumadocs/cli add fumadocs/api-docs/schema
```

## @fumadocs/cli@1.4.1

### Add Astro framework support

Add Astro as a supported framework with React islands, including framework providers, an example app, create-app template support, search integration, OG image generation, and documentation.

## @fumadocs/cli@1.4.0

### Default to Base UI

Internal packages & templates now use Base UI rather than Radix UI.

# fumadocs

## 1.3.10

### Patch Changes

- 2d22086: Improve for Sanity registry

## 1.3.9

### Patch Changes

- af7ee2d: fix layout preserve plugin

## 1.3.8

### Patch Changes

- 71c15fd: fix base dir detection for React Router

## 1.3.7

### Patch Changes

- 2d8f596: fix `npm pack` skipping nested `node_modules`

## 1.3.6

### Patch Changes

- 690ddb9: bundle more deps

## 1.3.5

### Patch Changes

- 7c59264: Adopt Fuma CLI

## 1.3.4

### Patch Changes

- 1a84b96: hotfix cwd for default config

## 1.3.3

### Patch Changes

- 3ff78c9: Support framework-agnostic route handler

## 1.3.2

### Patch Changes

- 823d880: Support slot in customize command

## 1.3.1

### Patch Changes

- e201942: support layout type

## 1.3.0

### Minor Changes

- 0ddaa8a: Preserve layout imports for slots

## 1.2.6

### Patch Changes

- 42e17a4: Support `cwd` in installer
- b2191f5: Expose installer

## 1.2.5

### Patch Changes

- 5453502: use Shiki.js v4

## 1.2.4

### Patch Changes

- c22f6ee: bump tsdown
- 4c570ce: add Flux layout to customize option

## 1.2.3

### Patch Changes

- 65ff886: Improve CLI interactive experience

## 1.2.2

### Patch Changes

- 6039041: Migrate to oxc for AST manipulation

## 1.2.1

### Patch Changes

- b16a32f: Switch to tsdown for bundling

## 1.2.0

### Minor Changes

- 389e68b: Fumadocs UI 16.3

## 1.1.0

### Minor Changes

- 897fdef: Update `customize` command to support Fumadocs UI 16.2.0

## 1.0.3

### Patch Changes

- 5210f18: Support Fumadocs 16 in `peerDependencies`.

## 1.0.2

### Patch Changes

- a3a14e7: Bump deps

## 1.0.1

### Patch Changes

- c9c27fe: Support Shadcn CLI v3

## 1.0.0

### Major Changes

- 3f6e948: Redesign installer & fumadocs registry schema

## 0.2.1

### Patch Changes

- 1b7bc4b: Add `@types/react` to optional peer dependency to avoid version conflict in monorepos

## 0.2.0

### Minor Changes

- ba35933: Support dynamic import transformation

### Patch Changes

- 1d07c67: Replace `execa` with `tinyexec` & removed unused devDeps
- ba35933: Improve dep install UI

## 0.1.1

### Patch Changes

- 482f728: add home layout to customize option

## 0.1.0

### Minor Changes

- 72a3e8c: Add customize command

## 0.0.8

### Patch Changes

- 4be74f6: Improve CLI

## 0.0.7

### Patch Changes

- a16bb23: Improve instructions in i18n plugin

## 0.0.6

### Patch Changes

- 969da26: Improve i18n api

## 0.0.5

### Patch Changes

- c8d9b08: support Next.js 15 i18n auto-config

## 0.0.4

### Patch Changes

- b254ec2: Fix Windows path problems

## 0.0.3

### Patch Changes

- 821e4a0: Fix src folder compatibility of plugins

## 0.0.2

### Patch Changes

- 9d37020: Change name of the package to avoid npm errors

## 0.0.1

### Patch Changes

- 75af7bc: Fix bin directive on index file
