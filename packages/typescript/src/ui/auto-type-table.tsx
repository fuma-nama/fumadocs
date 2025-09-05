import {
  type ParameterNode,
  type TypeNode,
  TypeTable,
} from 'fumadocs-ui/components/type-table';
import { type Jsx, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import * as runtime from 'react/jsx-runtime';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { renderMarkdownToHast, renderTypeToHast } from '@/markdown';
import 'server-only';
import type { ReactNode } from 'react';
import {
  type BaseTypeTableProps,
  type GenerateTypeTableOptions,
} from '@/lib/type-table';
import { type Generator } from '@/lib/base';
import type { Nodes } from 'hast';
import { parseTags } from '@/lib/parse-tags';

export type AutoTypeTableProps = BaseTypeTableProps;

export async function AutoTypeTable({
  generator,
  options = {},
  renderType = renderTypeDefault,
  renderMarkdown = renderMarkdownDefault,
  ...props
}: AutoTypeTableProps & {
  generator: Generator;

  renderMarkdown?: typeof renderMarkdownDefault;
  renderType?: typeof renderTypeDefault;
  options?: GenerateTypeTableOptions;
}) {
  const output = await generator.generateTypeTable(props, options);

  return output.map(async (item) => {
    const entries = item.entries.map(async (entry) => {
      const tags = parseTags(entry.tags);
      const paramNodes: ParameterNode[] = [];

      for (const param of tags.params ?? []) {
        paramNodes.push({
          name: param.name,
          description: param.description
            ? await renderMarkdown(param.description)
            : undefined,
        });
      }

      return [
        entry.name,
        {
          type: await renderType(entry.simplifiedType),
          typeDescription: await renderType(entry.type),
          description: await renderMarkdown(entry.description),
          default: tags.default ? await renderType(tags.default) : undefined,
          parameters: paramNodes,
          required: entry.required,
          deprecated: entry.deprecated,
          returns: tags.returns
            ? await renderMarkdown(tags.returns)
            : undefined,
        } as TypeNode,
      ];
    });

    return (
      <TypeTable
        key={item.name}
        type={Object.fromEntries(await Promise.all(entries))}
      />
    );
  });
}

function toJsx(hast: Nodes) {
  return toJsxRuntime(hast, {
    Fragment: runtime.Fragment,
    jsx: runtime.jsx as Jsx,
    jsxs: runtime.jsxs as Jsx,
    components: { ...defaultMdxComponents, img: undefined },
  });
}

async function renderTypeDefault(type: string): Promise<ReactNode> {
  return toJsx(await renderTypeToHast(type));
}

async function renderMarkdownDefault(md: string): Promise<ReactNode> {
  return toJsx(await renderMarkdownToHast(md));
}
