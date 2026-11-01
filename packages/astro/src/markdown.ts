import type { ElementType, ReactNode } from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';

type Components = Record<string, ElementType>;

/** the function output of `remarkLlms()` */
type Render = (props: { components?: Components }) => unknown;

/** documents with the function output, by their file paths relative to the project root */
const documents = new Map<string, { render: Render; components?: Components }>();

/** called by compiled MDX files */
export function registerMarkdown(file: string, render: Render, components?: Components) {
  documents.set(file, { render, components });
}

/**
 * Render the function output of a document into Markdown, its components can define their Markdown form with `asMarkdown()`.
 */
export async function renderMarkdown(
  file: string,
  components?: Components,
): Promise<string | undefined> {
  const document = documents.get(file);
  if (!document) return;

  const { renderToMarkdown } = await import('fumadocs-core/server');
  return renderToMarkdown(
    jsx(Markdown, { render: document.render, components: components ?? document.components }),
  );
}

function Markdown({ render, components }: { render: Render; components?: Components }) {
  return toReact(render({ components }));
}

/** a node of the JSX runtime of Astro */
interface AstroNode {
  'astro:jsx': true;
  type: ElementType | symbol;
  props: { children?: unknown };
}

const AstroFragment = Symbol.for('astro:fragment');

/** MDX files compile to the JSX runtime of Astro, its nodes become React elements */
function toReact(node: unknown): ReactNode {
  if (Array.isArray(node)) return node.map(toReact);
  if (!(node as AstroNode | null)?.['astro:jsx']) return node as ReactNode;

  const { type, props } = node as AstroNode;
  const children = toReact(props.children);
  return (Array.isArray(children) ? jsxs : jsx)(
    type === AstroFragment ? Fragment : (type as ElementType),
    { ...props, children },
  );
}
