## @fumadocs/openapi-standalone@0.1.1

### Faster static builds

- With at least 200 pages, `generateStatic()` renders them in worker threads, up to half the logical cores.

## @fumadocs/openapi-standalone@0.1.0

### New package: `@fumadocs/openapi-standalone`

- `generateStatic()` writes API docs of OpenAPI documents as static HTML files.
- `createApp()` from `@fumadocs/openapi-standalone/hono` serves them from a Hono app.
- `npx @fumadocs/openapi-standalone build` and `serve` take documents or a `fumadocs-openapi.config.ts` file.
