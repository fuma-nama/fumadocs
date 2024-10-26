import { toRuntime, toRuntimeAsync } from "fumadocs-mdx"
import * as docs_0 from "./index.mdx?collection=docs&hash=hash"
import * as docs_1 from "./folder/test.mdx?collection=docs&hash=hash"
import { docs as c_docs } from "./config.ts"
export const docs = await Promise.all([toRuntime("doc", docs_0, {"path":"index.mdx","absolutePath":"$cwd/packages/mdx/test/fixtures/index.mdx"}), toRuntime("doc", docs_1, {"path":"folder/test.mdx","absolutePath":"$cwd/packages/mdx/test/fixtures/folder/test.mdx"})].map(v => c_docs.transform(v, undefined)));