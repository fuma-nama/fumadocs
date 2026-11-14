# Set up Fumadocs

Instructions for AI agents. The setup of Fumadocs changes between versions, so run the commands below and read the linked docs instead of writing the setup from memory.

Add `.md` to the URL of a docs page to read it as Markdown. The guides are written per framework. In the links below, `<framework>` is the framework of the project: `next`, `react-router`, `tanstack-start`, `waku` or `astro`.

## New Site

Create a new docs site in a new folder, or as a workspace package of a monorepo:

```bash
npx create-fumadocs-app@latest my-docs --template +next+fuma-docs-mdx --install --yes
```

- `my-docs` is the folder to create.
- `--template` selects the framework. Use `+next+fuma-docs-mdx` (Next.js) unless the user wants another framework or a static site. The other templates are listed in https://fumadocs.dev/docs/cli/create-fumadocs-app.md
- `--yes` skips the prompts, and the options you don't pass use their defaults.

## Existing App

To add docs to an existing app, run the CLI in the folder of the app:

```bash
npx @fumadocs/cli@latest init
```

- The CLI detects the framework, and adds the docs pages with their own layout beside the existing routes.
- `--i18n` sets up internationalization.
- The CLI asks before it overwrites a file. Without a terminal, it keeps the file and prints its name. Pass `--yes` only when every file it writes can be overwritten.

To set up by hand, or to merge a file that the CLI kept, follow https://fumadocs.dev/docs/<framework>/manual-installation.md

## After the Setup

Both commands print the next steps. Start the dev server and open the docs, at `/docs` unless the output names another path.

For the tasks that follow, read the docs page of the task first:

- Writing pages: https://fumadocs.dev/docs/<framework>/markdown.md
- Organizing pages and folders: https://fumadocs.dev/docs/<framework>/page-conventions.md
- Other tasks: https://fumadocs.dev/llms.txt lists every docs page.
