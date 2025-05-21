---
'fumadocs-openapi': major
---

**Redesign `generateFiles`**

This redesign will finalize the behaviour of `generateFiles` to make it simpler, consistent across different versions of Fumadocs OpenAPI.

- Abandoned `groupByFolder`, it's deprecated long time ago and can be replaced with `groupBy`.
- Improved type safety, `groupBy` is now only available with `per` set to `operation`.
- `name` usage changed (see below).

The `name` option was supposed to designate a output path for generated page. Since `groupBy` was introduced, `name` became somehow useless because its design doesn't work well with `groupBy`.

**New `name` Design**:

It now accepts a function:

```ts
generateFiles({
    input: ['./content/docs/openapi/museum.yaml'],
    output: './content/docs/openapi/(generated)',
    per: 'operation',
    name: (output, document) => {
        // page info
        output.item
        // parsed OpenAPI schema
        document
        return 'dir/my-file'
    }
})
```

You can set `algorithm` to `v1` to keep the behaviour of Fumadocs OpenAPI v8:

```ts
generateFiles({
    input: ['./content/docs/openapi/museum.yaml'],
    output: './content/docs/openapi/(generated)',
    per: 'operation',
    name: {
        algorithm: 'v1'
    }
})
```

`per: operation`:

File name will be identical with your `operationId` if defined, otherwise fallback to endpoint path or webhook name.

```ts
generateFiles({
    input: ['./content/docs/openapi/museum.yaml'], 
    output: './content/docs/openapi/(generated)', 
    per: 'operation',
})
```

With `per: operation`, you can use `groupBy` to group pages:

- tag: `{tag}/{file}`
- route: `{endpoint}/{method}` (it will ignore the `name` option)
- none: `{file}` (default)

`per: tag | file`:

They are unchanged.
