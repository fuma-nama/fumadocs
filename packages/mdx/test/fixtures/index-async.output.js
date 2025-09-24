// @ts-nocheck -- skip type checking
import { _runtimeAsync, buildConfig } from "fumadocs-mdx/runtime/async"
const _sourceConfig = buildConfig(_source)
import path from "node:path"
import { _runtime } from "fumadocs-mdx"
import * as _source from "./config"
export const docs = _runtimeAsync.doc<typeof _source.docs>([{"info":{"path":"index.mdx","fullPath":"$cwd/packages/mdx/test/fixtures/generate-index/index.mdx",absolutePath:path.resolve("$cwd/packages/mdx/test/fixtures/generate-index/index.mdx"),"hash":"b12f02f44f5ed3318104c095c455e5ee"},"data":{}}, {"info":{"path":"folder/test.mdx","fullPath":"$cwd/packages/mdx/test/fixtures/generate-index/folder/test.mdx",absolutePath:path.resolve("$cwd/packages/mdx/test/fixtures/generate-index/folder/test.mdx"),"hash":"d41d8cd98f00b204e9800998ecf8427e"},"data":{}}], "docs", _sourceConfig)