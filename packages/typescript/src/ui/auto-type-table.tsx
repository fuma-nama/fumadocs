import { TypeTable } from 'fumadocs-ui/components/type-table';
import { type Jsx, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import * as runtime from 'react/jsx-runtime';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { renderMarkdownToHast } from '@/markdown';
import 'server-only';
import type { ReactNode } from 'react';
import {
  type BaseTypeTableProps,
  type GenerateTypeTableOptions,
  getTypeTableOutput,
} from '@/utils/type-table';
import { type Generator } from '@/lib/base';

export type AutoTypeTableProps = BaseTypeTableProps;

export async function AutoTypeTable({
  generator,
  options = {},
  renderMarkdown = renderMarkdownDefault,
  ...props
}: AutoTypeTableProps & {
  generator: Generator;

  renderMarkdown?: typeof renderMarkdownDefault;
  options?: GenerateTypeTableOptions;
}) {
  const output = await getTypeTableOutput(generator, props, options);

  return output.map(async (item) => {
    const entries = item.entries.map(
      async (entry) =>
        [
          entry.name,
          {
            type: entry.type,
            description: await renderMarkdown(entry.description),
            default: entry.tags.default || entry.tags.defaultValue,
            required: entry.required,
          },
        ] as const,
    );

    return (
      <TypeTable
        key={item.name}
        type={Object.fromEntries(await Promise.all(entries))}
      />
    );
  });
}

async function renderMarkdownDefault(md: string): Promise<ReactNode> {
  return toJsxRuntime(await renderMarkdownToHast(md), {
    Fragment: runtime.Fragment,
    jsx: runtime.jsx as Jsx,
    jsxs: runtime.jsxs as Jsx,
    components: { ...defaultMdxComponents, img: undefined },
  });
}
