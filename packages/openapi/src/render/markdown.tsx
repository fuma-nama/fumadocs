/* eslint-disable @typescript-eslint/no-explicit-any -- rehype plugins */
import { use, type ReactElement } from 'react';
import { cache } from '@/utils/cache';
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

const processCached = cache((text: string) =>
  processor.process({ value: text }),
);

export function Markdown({ text }: { text: string }) {
  const out = use(processCached(text));
  return out.result as ReactElement;
}
