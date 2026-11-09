import { jsx as astroJsx } from 'astro/jsx-runtime';
import { DevalueError, stringify } from 'devalue';
import type { MDXComponents } from 'mdx/types';
import type { ElementType, ReactNode } from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { IslandNode } from './island';
import type { StructuredRecord } from '../../shared/structured-data';

/*
 * The runtime of compiled MDX files. It never imports the source of pages: MDX modules importing it
 * would be in a cycle with every page, which makes the builds of Astro quadratic.
 */

/** a slot of the island, rendered by Astro */
export class Slot {
  constructor(readonly name: string) {}
}

/**
 * The root of compiled MDX: Astro renders the `components` of `<Content />` into slots of the island,
 * what they wrap is another island without hydration.
 */
export function ContentIsland({
  tree,
  components = {},
  children: island,
}: {
  tree: IslandNode[];
  components?: Record<string, ElementType>;
  /** `FumadocsIsland` with the slots of the document */
  children: { type: ElementType; props: Record<string, unknown> };
}) {
  const root = island.props;
  let count = 0;

  function render(list: unknown[], start: number, slots: unknown[]) {
    for (let i = start; i < list.length; i++) {
      const node = list[i];
      if (!Array.isArray(node)) continue;
      const childrenAt = node[0] === 1 ? 3 : 2;
      const name = node[childrenAt - 2];
      if (!Object.hasOwn(components, name)) {
        render(node, childrenAt, slots);
        continue;
      }

      const content: IslandNode[] = node.slice(childrenAt);
      const slot = `c${count++}`;
      slots.push(
        astroJsx(components[name], {
          ...node[childrenAt - 1],
          slot,
          children: content.every((item) => typeof item === 'string')
            ? content
            : astroJsx(island.type, createIsland(content)),
        }),
      );
      list[i] = new Slot(slot);
    }
    return slots;
  }

  /** the tree and slots of an island, it takes the slots of the document that it uses from the root */
  function createIsland(nodes: IslandNode[]) {
    const props: Record<string, unknown> = { children: render(nodes, 0, []) };
    try {
      props.tree = stringify(nodes, {
        slot(value) {
          if (!(value instanceof Slot)) return false;
          if (Object.hasOwn(root, value.name)) {
            props[value.name] = root[value.name];
            delete root[value.name];
          }
          return value.name;
        },
      });
      return props;
    } catch (error) {
      if (!(error instanceof DevalueError)) throw error;
      throw new Error(
        `The props of MDX components must be serializable, ${error.message} at "${error.path}".`,
        { cause: error },
      );
    }
  }

  const props = createIsland(tree);
  return astroJsx(island.type, { ...root, ...props });
}

const AstroFragment: unique symbol = Symbol.for('astro:fragment');

/** a node of the JSX runtime of Astro */
interface AstroNode {
  'astro:jsx': true;
  type: ElementType | typeof AstroFragment;
  props: { children?: Output };
}

/** MDX files compile to the JSX runtime of Astro */
type Output = ReactNode | AstroNode | Output[];

/** the props of the content, with its components */
interface MarkdownProps {
  components?: MDXComponents;
  [key: string]: unknown;
}

/** the function output of `remarkLlms()` */
type Render = (props: MarkdownProps) => Output;

/** the outputs of a compiled page, functions of the params of a page */
export interface PageOutputs {
  toc: (props: Record<string, unknown>) => TOCItemType[];
  structuredData: (props: Record<string, unknown>) => StructuredRecord[];
  /** with `includeProcessedMarkdown`, a string for static output */
  markdown?: string | Render;
  /** the MDX components of the content island */
  components?: MDXComponents;
}

/** set by compiled MDX files, by the key in their frontmatter */
export const pageOutputs = new Map<string, PageOutputs>();

/**
 * Render the function output of a document into Markdown, its components can define their Markdown form with `asMarkdown()`.
 */
export async function renderMarkdown(render: Render, props: MarkdownProps): Promise<string> {
  const { renderToMarkdown } = await import('fumadocs-core/server');
  return renderToMarkdown(jsx(Markdown, { render, props }));
}

function Markdown({ render, props }: { render: Render; props: MarkdownProps }) {
  return toReact(render(props));
}

function isAstroNode(node: Output): node is AstroNode {
  return typeof node === 'object' && node !== null && 'astro:jsx' in node;
}

/** the nodes of Astro become React elements */
function toReact(node: Output): ReactNode {
  if (Array.isArray(node)) return node.map(toReact);
  if (!isAstroNode(node)) return node;

  const { type, props } = node;
  const children = toReact(props.children);
  return (Array.isArray(children) ? jsxs : jsx)(type === AstroFragment ? Fragment : type, {
    ...props,
    children,
  });
}
