## Fumadocs Registry

A Fumadocs registry is similar to Shadcn registry, but included more hints for accurate replication of original file structure.

Different from Shadcn CLI (currently), Fumadocs CLI has better support for using another base URL for registry.
For example, `index.json` was only supported for Shadcn UI itself but not custom registries.

## Definition

index file: `{base_url}/_registry.json`, type: `OutputIndex[]`.
component file: `{base_url}/{name}.json`, type: `OutputComponent`.

We have a smarter build system that can accurately detect references to deps, local files, and sub component.
