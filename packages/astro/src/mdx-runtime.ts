import { DevalueError, stringify } from 'devalue';
import type { MDXComponents } from 'mdx/types';
import type { ElementType, ReactNode } from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import type { IslandNode } from './island';

/*
 * The runtime of compiled MDX files. It never imports the source of pages: MDX modules importing it
 * would be in a cycle with every page, which makes the builds of Astro quadratic.
 */

/** a slot of the island, rendered by Astro */
export class Slot {
  constructor(readonly name: string) {}
}

/** the island tree for `FumadocsIsland`, props can have the types of Astro islands like dates and maps */
export function serializeIsland(nodes: IslandNode[]): string {
  try {
    return stringify(nodes, { slot: (value) => value instanceof Slot && value.name });
  } catch (error) {
    if (!(error instanceof DevalueError)) throw error;
    throw new Error(
      `The props of MDX components must be serializable, ${error.message} at "${error.path}".`,
      { cause: error },
    );
  }
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

/** the function output of `remarkLlms()` */
type Render = (props: { components?: MDXComponents }) => Output;

/** documents with the function output, by the `markdownId` from the compiler */
const documents = new Map<string, { render: Render; components?: MDXComponents }>();

/** called by compiled MDX files */
export function registerMarkdown(id: string, render: Render, components?: MDXComponents) {
  documents.set(id, { render, components });
}

/**
 * Render the function output of a document into Markdown, its components can define their Markdown form with `asMarkdown()`.
 */
export async function renderMarkdown(id: string, components?: MDXComponents): Promise<string> {
  const document = documents.get(id);
  if (!document) throw new Error(`The function output of "${id}" is not registered.`);

  const { renderToMarkdown } = await import('fumadocs-core/server');
  return renderToMarkdown(
    jsx(Markdown, { render: document.render, components: components ?? document.components }),
  );
}

function Markdown({ render, components }: { render: Render; components?: MDXComponents }) {
  return toReact(render({ components }));
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
