# Set up a Fumadocs site

Instructions for AI coding agents.

- Fumadocs docs: https://fumadocs.dev/docs. Append `.mdx` to a docs page URL to get it as Markdown, and https://fumadocs.dev/llms.txt lists all pages.
- Framework guides are at `https://fumadocs.dev/docs/<framework>/<page>.mdx`, where `<framework>` is `next`, `react-router`, `tanstack-start`, `waku` or `astro`. Replace `<framework>` in the links below with the framework of the project.

## 1. Set up the project

For a new site, use create-fumadocs-app with Node.js 22.18+ or 24.11+. It generates the reference project, with search, `llms.txt` and OG images configured:

```bash
npx create-fumadocs-app@latest my-docs --template +next+fuma-docs-mdx --install --yes
```

- `+next+fuma-docs-mdx` (Next.js) is the default template, use it unless the user prefers another framework. The others are `waku`, `react-router`, `tanstack-start` and `astro`.
- For a fully static site (hosted on a CDN), use `+next+fuma-docs-mdx+static`, `react-router-spa` or `tanstack-start-spa`.
- `--yes` uses the defaults for options you don't pass, and `--pm` selects the package manager. All options: https://fumadocs.dev/docs/cli/create-fumadocs-app.mdx

For an existing app, run the CLI in the folder of the app, the docs app in a monorepo. It adds the docs pages with their own layout next to the existing routes:

```bash
npx @fumadocs/cli@latest init
```

- The CLI asks before overwriting a file, while `--yes` overwrites every file it writes, such as `lib/source.ts`. Check `git status` before running it, and review the diff after.
- Without a terminal, the CLI doesn't prompt: it keeps existing files unless you pass `--yes`, and a missing choice fails with the flag to pass.
- `--i18n` sets up internationalization.
- To set it up by hand instead, follow https://fumadocs.dev/docs/<framework>/manual-installation.mdx

Don't write the setup from memory or pin older versions. Don't edit the `.source/` folder, which Fumadocs MDX generates.

## 2. Write content

- Pages are MDX files in `content/docs`, and the folder structure defines the URLs. Every page needs a `title` in its frontmatter, and ideally a `description`.
- The layout renders the frontmatter `title` as the page heading, so don't start the content with a `# H1` that repeats it.
- A `meta.json` file orders the items of its folder: https://fumadocs.dev/docs/<framework>/page-conventions.mdx
  - `pages` lists file and folder names without extensions. A name that matches nothing is dropped without an error.
  - A folder with a `pages` list hides the pages it doesn't list. Add `"..."` to the list to include them.
- The collection schema drops frontmatter keys it doesn't define. To add a key, extend the schema with `pageSchema.extend({ ... })` in `lib/source.ts`, or in `src/content.config.ts` on Astro.
- Register MDX components in `components/mdx.tsx`.
- On the Next.js and Waku templates, `createRelativeLink` resolves relative file links like `[Guide](./guide.mdx)`. On React Router, TanStack Start and Astro, link the URL instead, like `/docs/guide`.
- Write callouts as `<Callout type="warn">...</Callout>`. GitHub alerts (`> [!NOTE]`) render as plain quotes, and `:::note` admonitions need a plugin: https://fumadocs.dev/docs/headless/mdx/remark-admonition.mdx
- When migrating existing Markdown docs, keep their content and only adjust frontmatter and links. Supported syntax: https://fumadocs.dev/docs/<framework>/markdown.mdx
- The site name and links are in `lib/layout.shared.tsx`, and the GitHub info in `lib/shared.ts`.

Outside the Next.js template, `components/` and `lib/` are under `app/` on React Router, and under `src/` on the other frameworks.

## 3. Check

Run `npm run dev`, open `/docs` on the local URL it prints, and make sure pages render.

Before you finish, run `npm run types:check` and `npm run build`. Fix errors by reading the docs of the feature, rather than removing the feature. To find broken links, follow https://fumadocs.dev/docs/<framework>/markdown/validate-links.mdx (not available on Astro).

## Markdown options

Remark and rehype plugins go in `mdxOptions`: of a collection in `lib/source.ts`, or of every collection in `source.config.ts` at the project root. The templates have no `source.config.ts`, create it when you need global options: https://fumadocs.dev/docs/mdx/global.mdx

On Astro, pass Sätteri plugins (`mdastPlugins`, `hastPlugins`) to `fumadocs()` in `astro.config.mjs`.

## Deploying and upgrading

- Deploying: https://fumadocs.dev/docs/<framework>/deploying.mdx
- Upgrade all Fumadocs packages together, with the commands of https://fumadocs.dev/docs/<framework>/upgrade.mdx
