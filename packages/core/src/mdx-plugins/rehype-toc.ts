import type { Processor, Transformer } from 'unified';
import type { Root, Element, Nodes } from 'hast';
import { toEstree } from 'hast-util-to-estree';
import type { Expression, ObjectExpression } from 'estree-jsx';
import { valueToEstree } from 'estree-util-value-to-estree';
import {
  guardedArray,
  handleTag,
  property,
  propsFunction,
  showCondition,
  toMdxExportRaw,
} from './utils';

export interface RehypeTocOptions {
  /**
   * Export the generated toc.
   *
   * - `true` (default): as an ESM export named `toc`.
   * - `false`: disable the plugin.
   */
  exportToc?:
    | boolean
    | {
        /**
         * generate to `file.data.rehypeToc`.
         */
        as: 'data';
      }
    | {
        /**
         * generate as an ESM export.
         */
        as: 'esm';
        name: string;
      };
}

declare module 'vfile' {
  interface DataMap {
    /**
     * [Fumadocs: rehype-toc] output data.
     */
    rehypeToc?: RehypeTOCItemType[];
  }
}

export interface RehypeTOCItemType {
  /**
   * the original heading tag
   */
  title: Element;
  url: string;
  depth: number;
  _step?: number;
}

/** whether content reads render scope: authored expressions, or branches of `<show>` checked when rendering */
function readsProps(node: Nodes): boolean {
  if (node.type === 'mdxTextExpression' || showCondition(node as never)) return true;
  return 'children' in node && node.children.some(readsProps);
}

const TocOnlyTag = '[toc]';
const NoTocTag = '[!toc]';
const HeadingTags = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

/**
 * Read the step number `remarkSteps` assigns to a heading.
 */
function getStep(properties: Element['properties']): number | undefined {
  const raw = properties['data-fd-step'] ?? properties.dataFdStep;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const step = Number(raw);
    if (Number.isFinite(step)) return step;
  }
}

export function rehypeToc(
  this: Processor,
  { exportToc = true }: RehypeTocOptions = {},
): Transformer<Root, Root> {
  if (exportToc === true) {
    exportToc = { as: 'esm', name: 'toc' };
  }

  if (exportToc === false) {
    return () => undefined;
  }

  return (tree, file) => {
    const items: (RehypeTOCItemType & { when: Expression[] })[] = [];
    let dynamic = false;

    const visit = (nodes: Nodes[], when: Expression[]) => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (!('children' in node)) continue;
        if (node.type !== 'element' || !HeadingTags.has(node.tagName) || !node.children.length) {
          const condition = showCondition(node as never);
          visit(node.children, condition ? [...when, condition] : when);
          continue;
        }

        const id = node.properties.id;
        if (typeof id !== 'string') continue;
        const last = node.children[node.children.length - 1];
        const text = last.type === 'text' ? last : undefined;
        const noToc = text && handleTag(text.value, NoTocTag);
        if (typeof noToc === 'string') {
          text!.value = noToc;
          continue;
        }
        const tocOnly = text && handleTag(text.value, TocOnlyTag);
        if (typeof tocOnly === 'string') {
          text!.value = tocOnly;
          nodes.splice(i--, 1);
        }

        dynamic ||= when.length > 0 || readsProps(node);
        items.push({
          title: node,
          depth: Number(node.tagName[1]),
          url: `#${id}`,
          _step: getStep(node.properties),
          when,
        });
      }
    };
    visit(tree.children, []);

    if (exportToc.as === 'esm') {
      const list: { value: Expression; when: Expression[] }[] = [];
      for (const { title, when, _step, ...item } of items) {
        const root = toEstree(title, {
          elementAttributeNameCase: 'react',
          stylePropertyNameCase: 'dom',
        }).body[0];
        if (root.type !== 'ExpressionStatement' || root.expression.type !== 'JSXElement') continue;

        const value = valueToEstree(
          _step === undefined ? item : { ...item, _step },
        ) as ObjectExpression;
        value.properties.push(
          property('title', {
            type: 'JSXFragment',
            openingFragment: { type: 'JSXOpeningFragment' },
            closingFragment: { type: 'JSXClosingFragment' },
            children: root.expression.children,
          }),
        );
        list.push({ value, when });
      }
      const array = guardedArray(list);
      tree.children.push(toMdxExportRaw(exportToc.name, dynamic ? propsFunction(array) : array));
    } else {
      file.data.rehypeToc = items.map(({ when: _, ...item }) => item);
    }
  };
}
