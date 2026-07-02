# AGENTS.md

## Cursor Cloud specific instructions

Fumadocs is a **pnpm + Turborepo monorepo** (`packages/*` libraries, `apps/docs` the fumadocs.dev site, `examples/*` sample apps). Standard commands live in `.github/contributing.md`, root `package.json`, and each package's `package.json` — refer to those rather than duplicating.

### Toolchain (already provisioned in the VM snapshot)
- Requires **Node >= 24.14.0** (root `engines`). The VM's `nvm` default is Node 24 and `~/.bashrc` prepends it to `PATH` so it beats the system `/exec-daemon` Node 22. `pnpm@11.5.3` is provided by `corepack`. New shells pick this up automatically; if a shell somehow shows Node 22, run `source ~/.bashrc`.
- The update script only runs `pnpm install --frozen-lockfile`. Everything below is manual.

### Must build packages before running any app
Libraries build with `tsdown` (not a dev server) and apps consume them from `dist/` via `workspace:*`. Before running/dev-ing `apps/docs` or any example, run once:
`pnpm run build --filter='./packages/*'`
The `[WARN] Failed to create bin ... dist/index.js` messages during `pnpm install` are expected before this build and disappear afterward.

### Running the docs site (primary manual-test target)
`pnpm run dev --filter=docs` → http://localhost:3000 (Next.js + Turbopack). No environment variables are required — search/AI/GitHub features are optional (see `turbo.json` `globalEnv`) and the site renders and searches fine without them. First page compile is slow (Turbopack compiles on first request).

### Test / lint / types gotchas
- `pnpm test` runs `vitest` in watch mode (blocks a TTY). For a one-shot run use `pnpm exec vitest run`.
- `pnpm lint` = oxlint (fast). `pnpm lint:format` = `oxfmt --check`; `pnpm format` fixes.
- `pnpm types:check` type-checks all packages.
