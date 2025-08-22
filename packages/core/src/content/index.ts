import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import { remarkWikilink } from '@/mdx-plugins';
import remarkRehype from 'remark-rehype';
import type { VFile } from 'vfile';
import { type Components, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import type { Root } from 'hast';
import * as JsxRuntime from 'react/jsx-runtime';
import type { PluggableList, Processor } from 'unified';
import type { ReactNode } from 'react';

function rehypeReact(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- processor errors
  this: Processor<any, any, any, any>,
  options: MarkdownProps = {},
) {
  this.compiler = (tree, file) => {
    return toJsxRuntime(tree as Root, {
      development: false,
      filePath: file.path,
      ...JsxRuntime,
      ...options,
    });
  };
}

interface MarkdownProps {
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
  children: string | VFile;
}) {
  const processor = remark()
    .use(remarkGfm)
    .use(remarkWikilink)
    .use(remarkPlugins)
    .use(remarkRehype)
    .use(rehypePlugins)
    .use(rehypeReact, options);

  return (await processor.process(content)).result as ReactNode;
}
