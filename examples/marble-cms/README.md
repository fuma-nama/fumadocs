# Marble CMS example

Copy `.env.example` to `.env.local`. In your Marble workspace, open **Settings > API Keys** and create a public API key with read access to posts. Set `MARBLE_API_KEY` in `.env.local` to that key.

Posts tagged `page` become documentation pages. Posts in the `docs` category appear at the documentation root, and a post whose slug ends in `index` becomes the section index.

Run the example from the repository root:

```bash
pnpm --filter example-marble-cms dev
```
