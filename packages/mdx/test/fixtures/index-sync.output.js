// @ts-nocheck -- skip type checking
import * as docs_1 from "./generate-index/folder/test.mdx?collection=docs&hash=hash"
import * as docs_0 from "./generate-index/index.mdx?collection=docs&hash=hash"
import { _runtime } from "fumadocs-mdx/runtime/next"
import * as _source from "./config"
export const docs = _runtime.doc<typeof _source.docs>([{ info: {"path":"index.mdx","fullPath":"packages/mdx/test/fixtures/generate-index/index.mdx"}, data: docs_0 }, { info: {"path":"folder/test.mdx","fullPath":"packages/mdx/test/fixtures/generate-index/folder/test.mdx"}, data: docs_1 }]);