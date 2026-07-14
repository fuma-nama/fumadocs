import * as __fdm from "fumadocs-mdx/runtime/macro";
import { default as __fd_glob_5 } from "../generate-index/meta.json?collection=test_fixtures_macro_source_ts_2&cfg=test%2Ffixtures%2Fmacro%2Fsource.ts&id=2"
import { frontmatter as __fd_glob_4 } from "../generate-index/folder/test.mdx?collection=test_fixtures_macro_source_ts_1&cfg=test%2Ffixtures%2Fmacro%2Fsource.ts&id=1&only=frontmatter"
import { frontmatter as __fd_glob_3 } from "../generate-index/index.mdx?collection=test_fixtures_macro_source_ts_1&cfg=test%2Ffixtures%2Fmacro%2Fsource.ts&id=1&only=frontmatter"
import { default as __fd_glob_2 } from "../generate-index-docs/meta.json?collection=test_fixtures_macro_source_ts_0&cfg=test%2Ffixtures%2Fmacro%2Fsource.ts&id=0"
import * as __fd_glob_1 from "../generate-index-docs/folder/test.mdx?collection=test_fixtures_macro_source_ts_0&cfg=test%2Ffixtures%2Fmacro%2Fsource.ts&id=0"
import * as __fd_glob_0 from "../generate-index-docs/index.mdx?collection=test_fixtures_macro_source_ts_0&cfg=test%2Ffixtures%2Fmacro%2Fsource.ts&id=0"

import { z } from 'zod';

export const docs = await __fdm.docs({ base: "test/fixtures/generate-index-docs", entries: {"index.mdx": __fd_glob_0, "folder/test.mdx": __fd_glob_1, }, meta: {"meta.json": __fd_glob_2, } });

export const blog = await __fdm.docAsync({ base: "test/fixtures/generate-index", passthroughs: ["extractedReferences"], head: {"index.mdx": __fd_glob_3, "folder/test.mdx": __fd_glob_4, }, body: {"index.mdx": () => import("../generate-index/index.mdx?collection=test_fixtures_macro_source_ts_1&cfg=test%2Ffixtures%2Fmacro%2Fsource.ts&id=1"), "folder/test.mdx": () => import("../generate-index/folder/test.mdx?collection=test_fixtures_macro_source_ts_1&cfg=test%2Ffixtures%2Fmacro%2Fsource.ts&id=1"), } });

export const metaOnly = await __fdm.meta({ base: "test/fixtures/generate-index", meta: {"meta.json": __fd_glob_5, } });
