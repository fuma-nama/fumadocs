---
packages:
  'create-fumadocs-app': patch
  '@fumadocs/cli': patch
---

### OG images in every template

- The TanStack Start, TanStack Start SPA and React Router SPA templates generate OG images of docs pages with Takumi.
- `--og-image next-og` warns on templates other than Next.js, instead of being ignored silently.
- The `og` feature tells you how to prerender the images in SPA mode.
