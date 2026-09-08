---
packages:
  npm:@fumadocs/cli: minor
---

## `init` and `feature` commands

The CLI now configures Fumadocs on an existing app and adds features to it, beyond installing UI components. Supported on Next.js, React Router, TanStack Start and Waku.

```bash
npx @fumadocs/cli init
npx @fumadocs/cli feature llms
```

`init` adds the docs pages in a dedicated route group (e.g. `app/(docs)`) with their own provider, layout and search route, so your existing setup stays untouched: it only registers the Fumadocs MDX plugin in your bundler config, imports the styles into your global CSS and adds `suppressHydrationWarning` to `<html>`. Pass `--i18n` to set up internationalization with locale-prefixed routes.

`feature <id>` installs the components and routes of a feature and wires them into your app: `ai` (Ask AI dialog), `llms` (`llms.txt`, `llms-full.txt` and per-page Markdown, with the `/docs/*.md` rewrite on Next.js), `mcp`, `webmcp` (experimental), `og`, `search` (Orama Cloud, Algolia, Typesense, Mixedbread), `feedback`, `epub` and `lint`. Features follow your setup: the `baseUrl` of your docs, `src/` directory, i18n, static export and SPA modes, Fumadocs MDX with the macro API or `source.config.ts`. Route URLs are read from the constants of `lib/shared.ts` (`docsRoute`, `docsContentRoute`, `docsImageRoute`), and route features add URL helpers like `getPageMarkdownUrl(page)` to `lib/source.ts`.

Every command takes `-y` to skip prompts and `--no-install` to only write dependencies to `package.json`.

Components are installed at the directories of your shadcn `components.json` by default, so the same component isn't duplicated in two places. `export epub` no longer scaffolds the export route, run `feature epub` instead.
