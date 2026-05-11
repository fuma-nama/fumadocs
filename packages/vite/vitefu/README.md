This is a patched version of `vitefu`, it is necessary because Fumadocs have multiple ESM deps that actually reference CJS deps.
For example: `fumadocs-core > ... > micomark > debug`.

`vitefu` doesn't perform deeper traverse, this patch enforces that.
