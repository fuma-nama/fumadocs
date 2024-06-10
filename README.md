![banner](./apps/docs/public/banner.png)

The framework for building documentation websites in Next.js.

📘 Learn More: [Documentation](https://fumadocs.vercel.app).

## Compatiability

All packages are **ESM only**.

## Sticker

![logo](./documents/logo.png)

Welcome to print it out :D

## Contributions

We are welcome for contributions! You may start with contributing to the docs,
it is located in `/apps/docs/content/docs`.

To run the docs site in dev mode, 
build the dependencies with `pnpm run build --filter=./packages/*` and run `pnpm run dev --filter=docs` to start the dev server.

Notice that this project is a monorepo using Turborepo, pnpm and
[Changesets](https://github.com/changesets/changesets). Make sure to format your
code with `pnpm run prettier` and add changeset with `pnpm changeset`.

### Environment Variables

You don't need any extra environment variables to run this project locally.
