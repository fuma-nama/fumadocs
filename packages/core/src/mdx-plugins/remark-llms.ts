import type { Transformer } from 'unified';
import { createCodeOutput, esmScope, isJsxElement } from './utils';
import type { Nodes, Root } from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';
import type { PlaceholderData } from './remark-llms.runtime';
import { stringifyHeadingId } from '../../../shared/heading-id';

export interface LLMsOptions {
  /**
   * export name for output Markdown.
   *
   * @default _markdown
   */
  as?: string;

  /**
   * Explicit heading IDs in output.
   *
   * @default true
   */
  headingIds?: boolean;

  /**
   * Filter the elements to be included in the output:
   *
   * - `true`: include element & its children.
   * - `children-only`: exclude element but keep its children.
   * - `false`: exclude element & its children.
   *
   * ESM nodes are always excluded.
   */
  filterElement?: (node: Nodes) => boolean | 'children-only';

  /**
   * Tag names of MDX components to be output as placeholders, render them with `renderPlaceholder()`.
   */
  mdxAsPlaceholder?: string[];

  /**
   * Form of the export:
   *
   * - `string`: the output Markdown, JSX elements keep their source. For a content source that renders pages for
   *   props, a document that reads props (authored expressions, `<show>`, heading IDs from code) exports a component
   *   instead, render it like `function`.
   * - `function`: a component, render it with `renderToMarkdown` from `fumadocs-core/server`: JSX elements are kept
   *   as JSX, receiving their original props and resolving like in the content, a component can call `asMarkdown()`
   *   to define its own Markdown form.
   *
   * @defaultValue `string`
   */
  output?: 'string' | 'function';

  /**
   * @internal output in file data
   */
  _data?: boolean;
}

type JsxElement = MdxJsxFlowElement | MdxJsxTextElement;

/**
 * Generate Markdown for LLMs from the authored source, other plugins can edit it with
 * `replaceSource()` from `fumadocs-core/mdx-plugins/stringifier`.
 *
 * Authored expressions keep their source, unless the content source renders pages for props: they are values, and
 * only the branches of `<show>` that show are kept.
 */
export function remarkLLMs({
  as = '_markdown',
  headingIds = true,
  _data = false,
  mdxAsPlaceholder,
  output,
  filterElement,
}: LLMsOptions = {}): Transformer<Root, Root> {
  return (tree, file) => {
    const out = createCodeOutput(file, {
      target: 'markdown',
      keep: output === 'function' ? () => true : undefined,
    });
    const { s } = out;

    const visit = (nodes: Nodes[]) => {
      for (const node of nodes) {
        const visibility = filterElement?.(node) ?? true;
        if (visibility === false) {
          s.replace(node, '');
          continue;
        }

        if ('children' in node) visit(node.children);
        if (visibility === 'children-only') {
          s.replace(node, (s) => s.inner(node));
        } else if (node.type === 'heading') {
          stringifyHeadingId(out, node, headingIds && file.data._headingIds);
        } else if (isJsxElement(node) && node.name && mdxAsPlaceholder?.includes(node.name)) {
          s.replace(node, (s) => toPlaceholder(node, out.toStatic(s.inner(node))));
        } else out.edit(node);
      }
    };

    visit(tree.children);
    const text = s.stringify(tree).trim();
    const value = text ? `${text}\n` : '';

    tree.children.unshift(out.esm(out.markdownCode(as, value, esmScope(tree))));
    if (_data) file.data.markdown = out.toStatic(value);
  };
}

function toPlaceholder(node: JsxElement, children: string): string {
  const attributes: Record<string, unknown> = {};
  for (const attr of node.attributes) {
    if (attr.type === 'mdxJsxExpressionAttribute') continue;
    attributes[attr.name] = attr.value;
  }

  return `\0${JSON.stringify({
    name: node.name,
    children,
    attributes,
  } satisfies PlaceholderData)}\0`;
}
