// @ts-nocheck -- skip type checking
import { _runtimeAsync, buildConfig } from "fumadocs-mdx/runtime/async"
const _sourceConfig = buildConfig(_source)
import { _runtime } from "fumadocs-mdx"
import * as _source from "./config.js"
export const docs = _runtimeAsync.doc<typeof _source.docs>([{"info":{"path":"index.mdx","absolutePath":"$cwd/packages/mdx/test/fixtures/index.mdx"},"data":{},"content":"# Hello World\n"}, {"info":{"path":"folder/test.mdx","absolutePath":"$cwd/packages/mdx/test/fixtures/folder/test.mdx"},"data":{},"content":""}], "docs", _sourceConfig)