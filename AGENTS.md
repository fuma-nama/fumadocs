<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

# Fumadocs

A published docs framework: `fumadocs-core` (headless), two UI packages, content sources, integrations (OpenAPI, AsyncAPI, GraphQL, Astro, ...), a CLI and the docs site in `apps/docs`. Users read every export, option and line of vendored UI, so bundle size, API surface and readability are the quality bar.

## Code

- Less code wins. Prefer deleting over adding.
- No backward-compat layers, fallbacks or migrations, except: deprecated APIs keep working in full, and public APIs with consumers stay compatible through a redesign. Legacy entry points are thin wrappers over one main function, never a parallel path.
- No chained `map`/`filter`/`flatMap`; mind time and space complexity.
- React: read react.dev, don't guess. Derive during render, act in event handlers, `useSyncExternalStore` for external stores and client-only checks, `useEffectEvent` instead of lint-disabled deps, ref callbacks with cleanup for DOM resources, `use()` of a cached promise under `<Suspense>` for async data. Create-once objects go in `useMemo(() => ..., [])`.
- One name per concept. No parallel lists of the same things, renamed duplicates, positional tuples or look-alike names. When two things share a name (like the loader plugin and the framework plugin of `fumadocs-openapi`), keep both names clean by scoping them (`loaderPlugin()` of the object that owns it, the default export of the module that owns it) rather than inventing messy local names.
- Types follow the structure of the code. Before writing one, work out which module owns the concept and how it relates to other types (it extends a contract, a field is another type's member, an option passes through to a library). Then express that relation:
  - derive with `extends`, `Pick`/`Omit` and indexed access, and reference the upstream exported type (bump the peer range if needed), so a change to the source type reaches every dependent type;
  - keep each type in the module that owns its concept (a plugin contract in the runtime module, options next to the integration), so its location tells who owns it. No `types.ts` collecting contracts.

  Hand-written copies of upstream types, parallel interfaces, `Parameters<typeof fn>[0]` in place of the named type and `x as {...}` casts break those relations: they drift silently and hide the owner.

- Comments only for decisions worth stating. Never describe what code does or what changed.
- Files: same names for the same roles across sibling folders, no tiny single-use files, no committed assets that a package already ships.
- Performance: remove work at its source instead of caching. Keep an optimization only if an A/B run on large real inputs (0.5/2/5 MB, real projects' docs) shows a clear gain worth its lines. Never re-implement a library's rules (a grammar, a resolver) to skip it.
- UI: an element is positioned by its owner through layout, never drawn under another or split across slots. Swapping in a shared component keeps the old look (compare typography and spacing). Extend `shared-api` and other shared pieces instead of copying markup, but only when sharing removes more code than it adds.

## Public exports

- Never add a public export by accident. tsdown rewrites `package.json` `exports` from its entry globs (e.g. `src/utils/use-*.{ts,tsx}` in the UI packages, `src/components/**`), so a new file there is published. Check `tsdown.config.ts` before creating files.
- To hide a leaked internal, refine the entry's export list (explicit names instead of `export *`) or move the helper into an existing module. Don't add a file to hide it.
- Barrel modules contain only re-exports; Turbopack loads every import in a barrel that has other code.

## Radix UI and Base UI

`packages/radix-ui` (`fumadocs-ui`) and `packages/base-ui` (`@fumadocs/base-ui`) are the same UI on different primitives. The docs site uses Base UI, aliased as `fumadocs-ui`.

- Make every change in both packages, with the same props and behavior. Only primitive usage and `components/ui/*` differ. See `.cursor/skills/radix-base-ui-sync/SKILL.md`.
- Known differences: `layouts/spacious` and `layouts/mini` are Base UI only, `src/legacy` is Radix only, Radix tabs activate on `mousedown`, Base UI tabs on `click`.
- Both packages vendor through the CLI registry (`packages/shared/registry.ts`). A file that registry components import needs a `files` rule there (e.g. the `utils/{cn,merge-refs,urls,hotkey}.ts` lib rule).
- Nothing consumes `packages/radix-ui` at runtime in this repo, so test it explicitly (a jsdom harness against both `dist`s) rather than assuming Base UI results carry over.

## RSC and non-RSC frameworks

Fumadocs runs on Next.js and Waku (RSC), React Router and TanStack Start (with and without SSR, plus SPA modes), and Astro (React islands).

- Shared code must work without RSC. Server-only variants get their own entry (`codeblock.rsc.tsx`, `mdx.server.tsx` behind the `node` condition), never an async component in a client-reachable module.
- Mark interactive modules `'use client'`; keep server-only work out of them.
- No framework imports in shared packages. Use `usePathname`, `useRouter`, `useParams`, `Link` and `Image` from `fumadocs-core/framework`. `next/*` belongs only in framework adapters (`framework/next`, `provider/next`, OG helpers).
- Consider static export versus server output (`output: 'export'`, SPA templates, Astro adapters): features that need a server degrade or report why, not fail at runtime.
- Verify in the examples (`examples/next`, `react-router`, `react-router-rsc`, `react-router-spa`, `tanstack-start`, `tanstack-start-spa`, `waku`, `astro`) that match the change, against built `dist`.

## Internationalization

- Every UI string goes through `useTranslations({ note })` from `@fuma-translate/react`, e.g. `t('Close Banner', { note: 'aria-label' })`. Its translation key is the string followed by every note, like `Close Banner(banner)(aria-label)`. The build writes each package's keys to the gitignored `src/.translations/`.
- Adding, changing or removing a UI string changes its key, so update every preset in `packages/language/src` (`zh-cn.ts`, `zh-tw.ts`) in the same change: translate the new key and delete the old one. CI runs `pnpm --filter @fumadocs/language types:check` against the built packages, and it fails on a key that no package uses anymore. It reports only the first stale key per preset, so compare the presets with the generated `src/.translations/keys.json` of each package.
- Routing features must handle `fumadocs-core/i18n` setups: every `hideLocale` mode, the locale in generated URLs (search, Markdown, OG images, sitemaps) and per-locale page trees. Check against `examples/i18n`, `react-router-i18n`, `tanstack-start-i18n`, `waku-i18n` and `astro-i18n`.

## Accessibility

- Every control has an accessible name: visible text, or an `aria-label` through translations.
- Decorative icons get `aria-hidden`; don't leave unnamed SVGs in the accessibility tree.
- Scrollable regions are keyboard reachable (`tabIndex={0}`, as code blocks do). Copy the existing solution before building a new one.
- Keep focus-visible styles, keyboard support of the primitives, and `prefers-reduced-motion` handling (`motion-reduce:` utilities) for new motion.
- Icons and radii follow the existing scale: 16px icons in 28px buttons, 14px in 24px actions, nested radius at most the container radius minus the inset.

## CLI and registry

`packages/cli` (`@fumadocs/cli`) installs UI by copying source from the registry compiled in `apps/docs/components/registry` (sub-registries of the UI packages, openapi, asyncapi, graphql, story, shared-api, ai-chat, sanity). `packages/create-app` scaffolds templates per framework.

- CLI installs vendor the whole UI: no npm dependency on the package that holds it, and no Tailwind `@source` preset for it. Keep integrations thin, with shared logic in the package.
- A vendored file may only import files matched by its registry's `files` rules or public exports of other packages, type-only imports included. Tests, `tsc` and lint don't catch this: run `node ./scripts/pre-build.ts` in `apps/docs` after changing imports in vendored UI.
- CLI features (`packages/cli/src/features`) support every framework in `src/project/index.ts`, including Astro and static output, or return the reason from `supports()`.
- Don't run `fumadocs add` non-interactively in the repo: its prompt defaults to installing dependencies and rewrites the lockfile. Test installs through `FumadocsComponentInstaller` with a local registry connector from a scratch script.
- Templates in `packages/create-app/template` are synced from `examples/` with `pnpm --filter create-fumadocs-app sync`: change the example, then sync.

## Framework plugins

`fumadocs-core/framework/plugin` is the plugin API of integrations. Like Vite plugins, each is the default export of the integration's `./press` subpath, a function named `<name>Plugin` (`export default function openapiPlugin()` in `fumadocs-openapi/press`), with its option types as named exports. Fumadocs ships no engine for it: Fumapress (`@fumapress/core`, in its own repo) runs the plugins and extends the API.

- Plugins use only that API, never Fumapress types. Dependencies go one way, Fumapress to Fumadocs.
- Extend the API only when no existing hook fits, and keep it complete on its own.
- Test plugins without an engine: a `PluginContext` object and a loader built from `configureLoader`, hooks called with `.call(ctx, ...)`.

## Astro integration

`packages/astro` (`@fumadocs/astro`) is the low-level integration: it compiles content collections with Fumadocs and renders their MDX as React islands, users own their routes like on React Router. The managed runtime with plugins is `@fumapress/astro`, in the Fumapress repo.

- Modules imported by the content island (the MDX components module and what it imports) must not import anything that imports the source: it puts every page in a cycle with the source and Astro's build slows superlinearly.
- MDX components hydrate by name from the collection's `components` module, and their props must be serializable.
- The `components` of `<Content />` render like in Astro MDX: Astro renders them into slots of the island, without hydrating. We build on Astro's behaviour, not an RSC emulation.
- Page Markdown lives at `<page>.md`.
- Search composes a per-provider hook from `fumadocs-core/search/client` (`useStaticSearch`, `useFetchSearch`, ...) with the dialog parts of `fumadocs-ui/components/dialog/search`. Never pass `SearchClient`s or route through `experimental_useSearch` when a provider hook exists.
- Check changes across setups: i18n with `hideLocale`, `base`/`trailingSlash`/`build.format`, static versus an adapter.
- Astro needs Node >= 22.23.4.

## Docs

Content is in `apps/docs/content/docs`; navigation is `meta.json`.

- Concise, progressive disclosure. Show API usage as type-checked code blocks, not prose. Keep every block a reader copies, cut caveats the example already avoids.
- Explain each page on its own terms. No redundant tables that repeat the sidebar or another page. Link a noun phrase that names its target, at most one or two links per short paragraph. Files of one step go in one code block tab group (`tab="<path>"`). A single file is a titled code block, not tabs.
- No em-dashes or AI filler. Plain sentences, no comma splices.
- Shared guides treat Next.js, React Router, TanStack Start, Waku and Astro alike: per-framework code gets a tab for each, or one sentence says why a framework is left out.
- Markdown plugin pages split only `unified` and `Sätteri` tabs, both as Fumadocs MDX `source.config.ts`, and say whether it's a remark or rehype plugin. Don't name other setups.
- Prefer showing a composition in docs over adding a layout-only component.
- `pnpm lint` in `apps/docs` imports everything reachable from MDX in plain Node: no `next/*` imports there (use `fumadocs-core/framework`, `React.lazy`).

## Changesets

Release notes live in `.tegami/<YYYY-MM-DD>-<slug>.md` ([Tegami](https://tegami.fuma-nama.dev)):

```md
---
packages:
  'fumadocs-ui': patch
  '@fumadocs/base-ui': patch
---

### Short user-facing title

- One line per change.
```

- The body needs a heading; without one Tegami silently drops the file.
- One-line, user-facing bullets. No mechanisms, no links to issues closed as not planned.
- Additive and opt-in features are `patch`; `minor` is for API reshapes and deprecations. Minor release notes say "refactored" and "deprecated", never "breaking".
- UI changes list both `fumadocs-ui` and `@fumadocs/base-ui`. Examples, `docs`, `shared` and `tsconfig` are not released.
- Don't run `tegami version` locally.

## Checks

- Run `pnpm --filter <pkg> types:check`, `lint` and `test` for touched packages, and `pnpm format`. Build dependencies first when an example or the docs consume `dist`.
- Builds and example runs leave generated changes (`package.json` exports, route types, lockfile churn): revert the ones that aren't part of the change.
