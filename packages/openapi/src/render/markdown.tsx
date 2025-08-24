/* eslint-disable @typescript-eslint/no-explicit-any -- rehype plugins */
import { type ReactElement } from 'react';
import {
  rehypeCode,
  type RehypeCodeOptions,
  remarkGfm,
  remarkImage,
} from 'fumadocs-core/mdx-plugins';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { remark } from 'remark';
import remarkRehype from 'remark-rehype';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import * as JsxRuntime from 'react/jsx-runtime';

const processor = remark()
  .use(remarkGfm)
  .use(remarkImage, { useImport: false })
  .use(remarkRehype)
  .use(rehypeCode, {
    langs: [],
    lazy: true,
  } satisfies Partial<RehypeCodeOptions>)
  .use(rehypeReact);

function rehypeReact(this: any) {
  this.compiler = (tree: any, file: any) => {
    return toJsxRuntime(tree, {
      development: false,
      filePath: file.path,
      ...JsxRuntime,
      components: defaultMdxComponents,
    });
  };
}

export async function Markdown({ text }: { text: string }) {
  const out = await processor.process({
    value: text,
  });

  return out.result as ReactElement;
}
