// oxlint-disable react-hooks/exhaustive-deps
// oxlint-disable react-hooks/rules-of-hooks
import { remark } from 'remark';
import remarkRehype, { type Options as RemarkRehypeOptions } from 'remark-rehype';
import { type Compatible, VFile } from 'vfile';
import { type Components, toJsx } from '@/utils/hast-to-jsx';
import type { Root } from 'hast';
import type * as Mdast from 'mdast';
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
  components?: Partial<Components>;
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
        return toJsx(out, { components: props.components });
      }

      const v = useMemo(() => processor.runSync(parse(file), file), [id]);
      return toJsx(v, { components: props.components });
    },
    async MarkdownServer(props) {
      const file = new VFile(props.children);

      return toJsx(await processor.run(parse(file), file), { components: props.components });
    },
  };
}

export function Markdown(props: MarkdownProps & MarkdownRendererOptions) {
  return createMarkdownRenderer(props).MarkdownServer(props);
}
