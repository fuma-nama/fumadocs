import { defineMdastPlugin, type MdastVisitorContext } from 'satteri';
import type { Nodes } from 'mdast';
import { gfmToMarkdown } from 'mdast-util-gfm';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import {
  defaultStringifier as structureDefaultStringifier,
  type Stringifier,
  type StringifyOptions,
} from 'fumadocs-core/mdx-plugins/remark-structure';
import { flattenNode } from '@/utils';

export interface StructureOptions {
  types?: string[] | ((node: Nodes) => boolean);
  mdxTypes?: (node: Nodes) => boolean;
  stringify?: Stringifier | StringifyOptions;
  exportAs?: string | boolean;
}

interface StringifierContext {
  addContent: (...content: StructuredData['contents']) => void;
}

function wrapStringifier(
  stringifyOptions?: StringifyOptions | Stringifier,
): Stringifier | null {
  if (!stringifyOptions) return null;
  if (typeof stringifyOptions === 'function') {
    const fn = stringifyOptions as (node: Nodes, ctx: StringifierContext) => string;
    return (node, ctx) => fn(structuredClone(node), ctx);
  }

  const base = structureDefaultStringifier({
    ...stringifyOptions,
    ...gfmToMarkdown(),
    handlers: {
      inlineMath(node: { value: string }) {
        return `$${node.value}$`;
      },
      math(node: { value: string }) {
        return `$$\n${node.value}\n$$`;
      },
      ...stringifyOptions.handlers,
    },
  });
  const baseFn = base as (node: Nodes, ctx: StringifierContext) => string;
  return (node, ctx) => baseFn(structuredClone(node), ctx);
}

export function remarkStructure({
  types = ['heading', 'paragraph', 'blockquote', 'tableCell', 'mdxJsxFlowElement'],
  mdxTypes = (node) => !('children' in node) || node.children.length === 0,
  stringify: stringifyOptions,
  exportAs = false,
}: StructureOptions = {}) {
  const matchType =
    typeof types === 'function' ? types : (node: Nodes) => types.includes(node.type);
  const stringify = wrapStringifier(stringifyOptions);

  return () => {
    const data: StructuredData = { contents: [], headings: [] };
    let lastHeading: string | undefined;
    let seeded = false;

    const stringifierCtx: StringifierContext = {
      addContent(...content) {
        for (const item of content) {
          data.contents.push({ ...item, heading: item.heading ?? lastHeading });
        }
      },
    };

    function finish(ctx: MdastVisitorContext) {
      ctx.data.structuredData = data;
    }

    function visit(node: Nodes, ctx: MdastVisitorContext) {
      if (!matchType(node)) return;
      if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
        if (!mdxTypes(node)) return;
      }

      if (!seeded) {
        const frontmatter = ctx.data.frontmatter as
          | { _openapi?: { structuredData?: StructuredData } }
          | undefined;
        const openapiData = frontmatter?._openapi?.structuredData;
        if (openapiData) {
          data.headings.push(...openapiData.headings);
          data.contents.push(...openapiData.contents);
        }
        seeded = true;
      }

      if (node.type === 'heading') {
        const headingData = (node.data ?? {}) as { hProperties?: { id?: string } };
        const id = headingData.hProperties?.id;
        if (!id) return;

        const content = (
          stringify ? stringify.call(undefined as never, node, stringifierCtx) : flattenNode(node)
        ).trim();
        if (content.length > 0) data.headings.push({ id, content });
        lastHeading = id;
        return;
      }

      const content = (
        stringify ? stringify.call(undefined as never, node, stringifierCtx) : flattenNode(node)
      ).trim();
      if (content.length > 0) {
        data.contents.push({ heading: lastHeading, content });
      }
    }

    return defineMdastPlugin({
      name: 'remark-structure',
      heading(node, ctx) {
        visit(node, ctx);
        finish(ctx);
      },
      paragraph(node, ctx) {
        visit(node, ctx);
        finish(ctx);
      },
      blockquote(node, ctx) {
        visit(node, ctx);
        finish(ctx);
      },
      tableCell(node, ctx) {
        visit(node, ctx);
        finish(ctx);
      },
      mdxJsxFlowElement(node, ctx) {
        visit(node, ctx);
        finish(ctx);
      },
    });
  };
}

export type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
