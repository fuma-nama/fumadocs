## Contributing Guide

We greatly appreciate your willingness to contribute to this project!
Before submitting a pull request, there are some guidelines you should notice.

### Guidelines

This project is a monorepo using Turborepo, pnpm and
[Changesets](https://github.com/changesets/changesets).

#### Before Submitting

- Check if there's other similar PRs.
- Format your code with `pnpm run format`.
- Add changesets with `pnpm changeset`, which documents the changes you've made.
- Run unit tests with `pnpm test` and update snapshots if necessary.

#### New Feature

Before submitting a new feature, make sure to open an issue (Feature Request) with sufficient information and reasons about the new feature.
After the feature request is approved, you can submit a pull request.

#### Bug Fixes

Provide a detailed description of the bug (with live demo if possible).
OR open a bug report and link it in your PR.

#### Docs

Contributing to the docs is relatively easier, make sure to check the typos and grammatical mistakes before submitting.

### Local Development

Follow the steps below to set up the project locally for development.

#### Prerequisites

- Node
- pnpm  
- Git

#### Setup

```bash
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
```

#### Install Dependencies

```bash
pnpm install
```

#### Running the Project

```bash
pnpm run dev
```

Start all apps except examples:

```bash
pnpm run dev:all
```

Start only example apps:

```bash
pnpm run dev:examples
```

#### Build

```bash
pnpm run build
```

#### Formatting & Linting

```bash
pnpm run format
pnpm run lint
```

#### Type Checking

```bash
pnpm run types:check
```

#### Tests

```bash
pnpm test
```

### New to contributing?

You may start with contributing to the docs,
it is located in `/apps/docs/content/docs`.

To run the docs site in dev mode,
build the dependencies with `pnpm run build --filter=./packages/*` and run `pnpm run dev --filter=docs` to start the dev server.

You don't need any extra environment variables to run this project.
