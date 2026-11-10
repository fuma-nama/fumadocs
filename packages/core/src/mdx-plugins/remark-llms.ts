import type { Transformer } from 'unified';
import { isStaticOutput } from '../../../shared/code-output';
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
   * - `string`: the output Markdown, authored expressions keep their source.
   * - `function`: a component, render it with `renderToMarkdown` from `fumadocs-core/server`: JSX elements are kept
   *   as JSX, receiving their original props and resolving like in the content, a component can call `asMarkdown()`
   *   to define its own Markdown form.
   *
   * @defaultValue `function` for a content source that renders pages for props, otherwise `string`
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
 * Authored expressions and the branches of `<show>` are rendered from code.
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
    const isStatic = isStaticOutput(file.data, output && output === 'string');
    const out = createCodeOutput(file, undefined, isStatic);
    const { s } = out;

    const visit = (nodes: Nodes[]) => {
      for (const node of nodes) {
        const visibility = node.type === 'mdxjsEsm' ? false : (filterElement?.(node) ?? true);
        if (visibility === false) {
          s.replace(node, '');
          continue;
        }

        if ('children' in node) visit(node.children);
        if (visibility === 'children-only') {
          s.replace(node, (s) => s.inner(node));
        } else if (out.markCode(node)) {
          // rendered from code
        } else if (node.type === 'heading') {
          const id = node.data?.hProperties?.id;
          const code = typeof id === 'string' && file.data._headingIds?.[id];
          stringifyHeadingId(
            s,
            node,
            headingIds,
            (node: Nodes) => s.range(node),
            code ? out.expression(code, id as string) : (id ?? undefined),
          );
        } else if (isJsxElement(node) && node.name) {
          const element = !mdxAsPlaceholder?.includes(node.name) && out.keep(node);
          if (element === false)
            s.replace(node, (s) => toPlaceholder(node, out.toStatic(s.inner(node))));
          else if (element)
            s.replace(node, (s) => {
              let children = s.inner(node);
              // block content on its own lines
              if (children && node.type === 'mdxJsxFlowElement') children = `\n${children}\n`;
              return out.wrap(element, children);
            });
        }
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
