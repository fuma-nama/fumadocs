import { remark } from 'remark';
import remarkRehype, { type Options as RemarkRehypeOptions } from 'remark-rehype';
import { type Compatible, VFile } from 'vfile';
import { type Components, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import type { Root } from 'hast';
import type * as Mdast from 'mdast';
import * as JsxRuntime from 'react/jsx-runtime';
import type { PluggableList } from 'unified';
import { type FC, use, useMemo } from 'react';

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
  const promises: Record<string, Promise<Root>> = {};

  function render(tree: Root, file: VFile, props: MarkdownProps) {
    return toJsxRuntime(tree, {
      development: false,
      filePath: file.path,
      components: props.components,
      ...JsxRuntime,
    });
  }

  function parse(file: VFile): Mdast.Root {
    return processor.parse(file) as Mdast.Root;
  }

  return {
    Markdown(props) {
      const { async = false, children } = props;
      const file = new VFile(children);
      const id = `${file.path}:${file.value}`;

      if (async) {
        promises[id] ??= processor.run(parse(file), file);
        const out = use(promises[id]);
        return render(out, file, props);
      }

      // oxlint-disable-next-line eslint-plugin-react-hooks/rules-of-hooks eslint-plugin-react-hooks/exhaustive-deps -- assume `async` unchanged
      const v = useMemo(() => processor.runSync(parse(file), file), [id]);
      return render(v, file, props);
    },
    async MarkdownServer(props) {
      const file = new VFile(props.children);

      return render(await processor.run(parse(file), file), file, props);
    },
  };
}

export function Markdown(props: MarkdownProps & MarkdownRendererOptions) {
  return createMarkdownRenderer(props).MarkdownServer(props);
}
