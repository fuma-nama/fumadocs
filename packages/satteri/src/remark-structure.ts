import { defineMdastPlugin } from 'satteri';
import type { Nodes } from 'mdast';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import {
  defaultStringifier,
  type Stringifier,
  type StringifyOptions,
} from 'fumadocs-core/mdx-plugins/stringifier';
import { flattenNode } from '@/utils';
import { queueDataExport } from '@/inject-exports';

export interface StructureOptions {
  types?: string[] | ((node: Nodes) => boolean);
  mdxTypes?: (node: Nodes) => boolean;
  stringify?: Stringifier<StringifierContext> | StringifyOptions<StringifierContext>;
  exportAs?: string | boolean;
}

declare module 'satteri' {
  interface DataMap {
    structuredData?: StructuredData;
    frontmatter?: Record<string, unknown>;
  }
}

interface StringifierContext {
  addContent: (...content: StructuredData['contents']) => void;
}

export function remarkStructure({
  types = ['heading', 'paragraph', 'blockquote', 'tableCell', 'mdxJsxFlowElement'],
  mdxTypes = (node) => !('children' in node) || node.children.length === 0,
  stringify: stringifyOptions,
  exportAs = false,
}: StructureOptions = {}) {
  const matchType =
    typeof types === 'function' ? types : (node: Nodes) => types.includes(node.type);
  const stringify =
    typeof stringifyOptions === 'function'
      ? stringifyOptions
      : stringifyOptions
        ? defaultStringifier<StringifierContext>({
            ...stringifyOptions,
            stringify(node, parent, state, info, ctx) {
              const structured = node.data?.structuredData;
              if (structured) ctx.addContent(...structured.contents);
              return stringifyOptions.stringify?.(node, parent, state, info, ctx);
            },
          })
        : null;

  return () => {
    const data: StructuredData = { contents: [], headings: [] };
    let lastHeading: string | undefined;
    let seeded = false;
    let exported = false;

    const stringifierCtx: StringifierContext = {
      addContent(...content) {
        for (const item of content) {
          data.contents.push({ ...item, heading: item.heading ?? lastHeading });
        }
      },
    };

    function finish(ctx: { data: Record<string, unknown> }) {
      ctx.data.structuredData = data;
      if (exportAs && !exported) {
        exported = true;
        queueDataExport(
          ctx.data,
          typeof exportAs === 'string' ? exportAs : 'structuredData',
          data,
        );
      }
    }

    function visit(node: Nodes, ctx: { data: Record<string, unknown> }) {
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
