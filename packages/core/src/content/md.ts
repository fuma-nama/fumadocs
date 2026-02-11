import { remark } from 'remark';
import remarkRehype, { type Options as RemarkRehypeOptions } from 'remark-rehype';
import { type Compatible, VFile } from 'vfile';
import { type Components, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import type { Root } from 'hast';
import type * as Mdast from 'mdast';
import * as JsxRuntime from 'react/jsx-runtime';
import type { PluggableList } from 'unified';
import { type FC, use } from 'react';

export interface MarkdownRendererOptions {
  remarkPlugins?: PluggableList;
  rehypePlugins?: PluggableList;
  remarkRehypeOptions?: RemarkRehypeOptions;
}

export interface MarkdownRenderer {
  Markdown: FC<MarkdownProps>;
  MarkdownServer: FC<Omit<MarkdownProps, 'async'>>;
}

export interface MarkdownProps {
  async?: boolean;
  components?: Components;
  children: Compatible;
}

export function createMarkdownRenderer({
  rehypePlugins = [],
  remarkPlugins = [],
  remarkRehypeOptions,
}: MarkdownRendererOptions = {}): MarkdownRenderer {
  const processor = remark()
    .use(remarkPlugins)
    .use(remarkRehype, remarkRehypeOptions)
    .use(rehypePlugins);
  const cache: Record<string, Root> = {};
  const promises: Record<string, Promise<Root>> = {};

  function render(tree: Root, file: VFile, props: MarkdownProps) {
    return toJsxRuntime(tree, {
      development: false,
      filePath: file.path,
      components: props.components,
      ...JsxRuntime,
    });
  }

  function parse(file: VFile, _props: MarkdownProps): Mdast.Root {
    return processor.parse(file) as Mdast.Root;
  }

  return {
    Markdown(props) {
      const { async = false, children } = props;
      const file = new VFile(children);
      const key = String(file.value);

      if (async) {
        promises[key] ??= processor.run(parse(file, props), file);
        const out = use(promises[key]);
        return render(out, file, props);
      }

      cache[key] ??= processor.runSync(parse(file, props), file);
      return render(cache[key], file, props);
    },
    async MarkdownServer(props) {
      const file = new VFile(props.children);

      return render(await processor.run(parse(file, props), file), file, props);
    },
  };
}

export function Markdown(props: MarkdownProps & MarkdownRendererOptions) {
  return createMarkdownRenderer(props).MarkdownServer(props);
}
