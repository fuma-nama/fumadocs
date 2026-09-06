---
packages:
  npm:create-fumadocs-app: patch
---

## Add `--yes` flag for non-interactive usage

`create-fumadocs-app -y` (`--yes`) skips every prompt and uses the default for options you didn't pass, so scripts and AI coding agents can scaffold a project without a TTY:

```bash
npx create-fumadocs-app@latest my-docs --template +next+fuma-docs-mdx --install --yes
```

Previously this required setting `CI=1`. In `--yes` mode, a non-empty target directory fails instead of prompting for deletion.
