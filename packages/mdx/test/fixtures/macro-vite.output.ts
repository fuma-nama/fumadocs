import * as __fdm from "fumadocs-mdx/runtime/macro";

import { z } from 'zod';

export const docs = await __fdm.docs({ base: "test/fixtures/generate-index-docs", entries: import.meta.glob(["./**/*.{mdx,md}"], {
  "base": "./../generate-index-docs",
  "query": "?macro_id=test%2Ffixtures%2Fmacro%2Fsource.ts%23docs",
  "eager": true
}), meta: import.meta.glob(["./**/*.{json,yaml}"], {
  "base": "./../generate-index-docs",
  "query": "?macro_id=test%2Ffixtures%2Fmacro%2Fsource.ts%23docs",
  "eager": true,
  "import": "default"
}) });

export const blog = await __fdm.docAsync({ base: "test/fixtures/generate-index", head: import.meta.glob(["./**/*.{mdx,md}"], {
  "base": "./../generate-index",
  "query": "?macro_id=test%2Ffixtures%2Fmacro%2Fsource.ts%23blog&only=frontmatter",
  "eager": true,
  "import": "frontmatter"
}), body: import.meta.glob(["./**/*.{mdx,md}"], {
  "base": "./../generate-index",
  "query": "?macro_id=test%2Ffixtures%2Fmacro%2Fsource.ts%23blog"
}) });

export const metaOnly = await __fdm.meta({ base: "test/fixtures/generate-index", meta: import.meta.glob(["./**/*.{json,yaml}"], {
  "base": "./../generate-index",
  "query": "?macro_id=test%2Ffixtures%2Fmacro%2Fsource.ts%23metaOnly",
  "eager": true,
  "import": "default"
}) });
