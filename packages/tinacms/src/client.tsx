import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { TOCItemType } from 'fumadocs-core/toc';
import Slugger from 'github-slugger';
import { isValidElement, type ReactElement, type ReactNode } from 'react';

/** a node of TinaCMS rich-text AST, aligned with the `content` prop of `<TinaMarkdown />` */
export interface RichTextNode {
  type: string;
  text?: string;
  value?: string;
  children?: RichTextNode[];
  [key: string]: unknown;
}

export interface RichTextRoot extends RichTextNode {
  type: 'root';
  children: RichTextNode[];
}

const headingLevels: Record<string, number> = {
  h1: 1,
  h2: 2,
  h3: 3,
  h4: 4,
  h5: 5,
  h6: 6,
};

export function isRichTextRoot(v: unknown): v is RichTextRoot {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as RichTextNode).type === 'root' &&
    Array.isArray((v as RichTextNode).children)
  );
}

export function flattenNode(node: RichTextNode): string {
  if (typeof node.text === 'string') return node.text;
  if (node.children) return node.children.map(flattenNode).join('');
  if (typeof node.value === 'string') return node.value;
  return '';
}

/** extract heading nodes from a rich-text body */
export function extractToc(body: unknown): RichTextNode[] {
  if (!isRichTextRoot(body)) return [];
  return body.children.filter((node) => node.type in headingLevels);
}

export function extractStructuredData(body: unknown): StructuredData {
  const structuredData: StructuredData = {
    headings: [],
    contents: [],
  };
  if (!isRichTextRoot(body)) return structuredData;

  const slugger = new Slugger();
  let lastHeading: string | undefined;

  for (const node of body.children) {
    const content = flattenNode(node).trim();
    if (!content) continue;

    if (node.type in headingLevels) {
      const id = slugger.slug(content);
      structuredData.headings.push({ id, content });
      lastHeading = id;
      continue;
    }

    structuredData.contents.push({
      heading: lastHeading,
      content,
    });
  }

  return structuredData;
}

export function renderToc(opts: {
  toc: RichTextNode[];
  /** render rich-text content, e.g. with `<TinaMarkdown />` */
  render: (node: RichTextRoot) => ReactNode;
}): TOCItemType[] {
  const { toc, render } = opts;
  const slugger = new Slugger();

  return toc.map(
    (node): TOCItemType => ({
      depth: headingLevels[node.type] ?? 1,
      url: `#${slugger.slug(flattenNode(node))}`,
      title: render({
        type: 'root',
        children: [{ ...node, type: 'p' }],
      }),
    }),
  );
}

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
type HeadingComponent = (props: { children?: ReactNode }) => ReactElement;

/**
 * heading components for `<TinaMarkdown />` that add anchor ids compatible with `renderToc()`.
 *
 * Call it during render so every document starts with fresh state:
 * ```tsx
 * <TinaMarkdown content={body} components={{ ...createHeadingComponents() }} />
 * ```
 */
export function createHeadingComponents(): Record<HeadingTag, HeadingComponent> {
  const slugger = new Slugger();

  function create(Tag: HeadingTag): HeadingComponent {
    return ({ children }) => <Tag id={slugger.slug(flattenReactNode(children))}>{children}</Tag>;
  }

  return {
    h1: create('h1'),
    h2: create('h2'),
    h3: create('h3'),
    h4: create('h4'),
    h5: create('h5'),
    h6: create('h6'),
  };
}

function flattenReactNode(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenReactNode).join('');
  if (isValidElement(node)) {
    // `<TinaMarkdown />` renders child nodes lazily, extract text from the AST instead:
    // custom components receive a `<TinaMarkdown content={children} />` element,
    // and its node renderer receives the node via `child`.
    const props = node.props as { children?: ReactNode; content?: unknown; child?: unknown };
    if (isRichTextNode(props.child)) return flattenNode(props.child);

    const content = Array.isArray(props.content) ? props.content : [props.content];
    if (content.every(isRichTextNode)) return content.map(flattenNode).join('');

    return flattenReactNode(props.children);
  }
  return '';
}

function isRichTextNode(v: unknown): v is RichTextNode {
  return typeof v === 'object' && v !== null && typeof (v as RichTextNode).type === 'string';
}
