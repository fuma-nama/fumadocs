![banner](./apps/docs/public/banner.png)

The framework for building documentation websites in Next.js.

📘 Learn More: [Documentation](https://next-docs-zeta.vercel.app)

## Installation

This monorepo includes three packages.

### Next Docs Zeta

The headless UI library for building docuementation websites.

It includes necessary parts such as TOC, Sidebar, and some useful utilities.

```bash
npm install next-docs-zeta
```

### Next Docs UI

The framework built on top of Next Docs Zeta. It offers many out-of-the-box
features along with a well-designed user interface.

```bash
npm install next-docs-ui
```

### Create Next Docs App

A CLI tool that generates documentation sites.

```bash
npx create next-docs-app
```

## Contributions

We are welcome for contributions! You may start with contributing to the docs,
it is located in `/apps/docs/content/docs`.

Notice that this project is a monorepo using Turborepo, pnpm and
[Changesets](https://github.com/changesets/changesets). Make sure to format your
code with `pnpm run prettier` and add changeset with `pnpm changeset`.

### Environment Variables

You don't need any extra environment variables to run this project locally.
