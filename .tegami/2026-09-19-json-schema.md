---
subject: JSON Schema toolkit
packages:
  npm:@fumadocs/json-schema: minor
  npm:fumadocs-openapi: major
  npm:@fumadocs/asyncapi: minor
  npm:@fumadocs/graphql: minor
---

## `@fumadocs/json-schema`

The JSON Schema utilities of API pages are now their own package, with no Fumadocs dependencies:

```ts
import { dereference, matches, mergeAllOf, sample, stringify } from '@fumadocs/json-schema';
import { bundle } from '@fumadocs/json-schema/bundle';
```

`bundle()` is a separate entry because it reads files and URLs, everything else runs in the browser.

`@fumadocs/json-schema/react` renders a schema into the data an API page draws: `generateSchemaUI()` with the `SchemaData` and `InfoTag` types. It was in the Schema UI before, where every install copied it.

They were `@fumadocs/api-docs/schema/*` before, and the API was cleaned up while moving:

| Before                                         | Now                                    |
| ---------------------------------------------- | -------------------------------------- |
| `ParsedSchema`                                 | `JsonSchema`                           |
| `NoReference` / `NoReferenceSwallow`           | `Dereferenced` / `DereferencedShallow` |
| `dereferenceShallow(schema)`                   | `dereference(schema)`                  |
| `matchesSchema(schema, value)`                 | `matches(schema, value)`               |
| `typeMatches(value, type)`                     | `matchesType(value, type)`             |
| `schemaToString(schema, FormatFlags.UseAlias)` | `stringify(schema, { alias: true })`   |

## Opt into code usages and TypeScript definitions

`createOpenAPIRenderer()` from `fumadocs-openapi` doesn't register the default code usage generators and TypeScript definitions, so a headless page doesn't bundle them:

```tsx
import { createCodeUsageGeneratorRegistry } from 'fumadocs-openapi/requests/generators';
import { registerDefault } from 'fumadocs-openapi/requests/generators/all';

createOpenAPIRenderer({
  codeUsages: registerDefault(createCodeUsageGeneratorRegistry()),
  components: { ... },
});
```

`fumadocs-openapi/ui` is unchanged, it registers both for you.

## Remove `useStorageKey()`

The hook returned `(name) => storageKeyPrefix + name`. Read the prefix from the page instead:

```tsx
const { storageKeyPrefix } = useOpenAPI();
localStorage.getItem(`${storageKeyPrefix}my-key`);
```

`useAsyncAPI()` works the same way.

## `@fumadocs/api-docs` is no longer published

It held the UI the integrations share, and that UI is now either bundled into them or installed with Fumadocs CLI, so nothing imports it by name any more. If you imported it directly:

| Before                                     | Now                                                  |
| ------------------------------------------ | ---------------------------------------------------- |
| `@fumadocs/api-docs/schema/*`              | `@fumadocs/json-schema`                              |
| `@fumadocs/api-docs/components/schema*`    | `npx @fumadocs/cli add fumadocs/api-docs/schema`     |
| `@fumadocs/api-docs/components/*` (the UI) | installed with the component that uses it            |
| `@fumadocs/api-docs/i18n`                  | the integration's own `Translations` covers its keys |
| `@fumadocs/api-docs/css/preset.css`        | already included by the integration's preset         |

The CLI namespace is unchanged, `fumadocs/api-docs/schema` still installs the Schema UI.
