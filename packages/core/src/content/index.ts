import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import type { Compatible } from 'vfile';
import { type Components, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import type { Root } from 'hast';
import * as JsxRuntime from 'react/jsx-runtime';
import type { PluggableList, Processor } from 'unified';
import type { ReactNode } from 'react';

function rehypeReact(this: Processor, options: MarkdownProps = {}) {
  this.compiler = (tree, file) => {
    return toJsxRuntime(tree as Root, {
      development: false,
      filePath: file.path,
      ...JsxRuntime,
      ...options,
    });
  };
}

export interface MarkdownProps {
  components?: Components;
}

export async function Markdown({
  children: content,
  remarkPlugins = [],
  rehypePlugins = [],
  ...options
}: MarkdownProps & {
  remarkPlugins?: PluggableList;
  rehypePlugins?: PluggableList;
  children: Compatible;
}) {
  const processor = remark()
    .use(remarkGfm)
    .use(remarkPlugins)
    .use(remarkRehype)
    .use(rehypePlugins)
    .use(rehypeReact, options);

  return (await processor.process(content)).result as ReactNode;
}
