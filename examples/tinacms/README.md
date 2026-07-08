# Fumadocs + TinaCMS

An example app using [`@fumadocs/tinacms`](https://fumadocs.dev/docs/integrations/content/tinacms) with the local TinaCMS backend.

## Development

```bash
pnpm dev
```

This runs `tinacms dev` (local GraphQL content API on port 4001 + visual editor) together with `next dev`:

- open http://localhost:3000/docs to view the docs.
- open http://localhost:3000/admin/index.html to edit content visually, changes are written back to `content/docs`.

## Tina Cloud

To use [Tina Cloud](https://app.tina.io) instead of the local backend, set `NEXT_PUBLIC_TINA_CLIENT_ID` and `TINA_TOKEN`, generate the client with `tinacms build`, and pass the generated client (`tina/__generated__/client`) to `createTinaCMSSource()` in [`lib/source.ts`](./lib/source.ts).
