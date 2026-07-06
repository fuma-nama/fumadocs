import type { MdastPluginDefinition, MdastVisitorContext } from 'satteri';
import type { Nodes } from 'mdast';
import { gfmToMarkdown } from 'mdast-util-gfm';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import {
  defaultStringifier as structureDefaultStringifier,
  type Stringifier,
  type StringifyOptions,
} from 'fumadocs-core/mdx-plugins/remark-structure';
import type { ExtraPluginHooks } from './compile';

export interface StructureOptions {
  types?: string[] | ((node: Nodes) => boolean);
  mdxTypes?: (node: Nodes) => boolean;
  stringify?: Stringifier | StringifyOptions;
  exportAs?: string | boolean;
}

interface StringifierContext {
  addContent: (...content: StructuredData['contents']) => void;
}

const STRUCTURE_VISITORS = [
  'heading',
  'paragraph',
  'blockquote',
  'tableCell',
  'mdxJsxFlowElement',
] as const;

function wrapStringifier(stringifyOptions?: StringifyOptions | Stringifier): Stringifier | null {
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

function nodeContent(
  node: Nodes,
  ctx: MdastVisitorContext,
  stringify: Stringifier | null,
  stringifierCtx: StringifierContext,
) {
  return stringify
    ? stringify.call(undefined as never, node, stringifierCtx).trim()
    : ctx.textContent(node).trim();
}

export function remarkStructure({
  types = ['heading', 'paragraph', 'blockquote', 'tableCell', 'mdxJsxFlowElement'],
  mdxTypes = (node) => !('children' in node) || node.children.length === 0,
  stringify: stringifyOptions,
}: StructureOptions = {}) {
  const matchType =
    typeof types === 'function' ? types : (node: Nodes) => types.includes(node.type);
  const stringify = wrapStringifier(stringifyOptions);

  const plugin: ExtraPluginHooks & { (): MdastPluginDefinition } = () => {
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

    function visit(node: Nodes, ctx: MdastVisitorContext) {
      if (!ctx.data.structuredData) ctx.data.structuredData = data;

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

        const content = nodeContent(node, ctx, stringify, stringifierCtx);
        if (content.length > 0) data.headings.push({ id, content });
        lastHeading = id;
        return;
      }

      const content = nodeContent(node, ctx, stringify, stringifierCtx);
      if (content.length > 0) {
        data.contents.push({ heading: lastHeading, content });
      }
    }

    return {
      name: 'remark-structure',
      ...Object.fromEntries(STRUCTURE_VISITORS.map((key) => [key, visit])),
    };
  };
  plugin.afterToJs = ({ result }) => {
    result.data.structuredData ??= { headings: [], contents: [] };
  };
  return plugin;
}

export type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
