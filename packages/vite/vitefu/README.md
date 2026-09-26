Derived from `vitefu`, trimmed to what `getConfig` needs.

`vitefu` stops at the first non-framework dependency, but Fumadocs has ESM dependencies that reference CJS ones (e.g. `fumadocs-core > ... > micromark > debug`), so this version keeps traversing below framework packages.
