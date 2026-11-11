import type { Processor, Transformer } from 'unified';
import type { Root, Element, Nodes } from 'hast';
import { toEstree } from 'hast-util-to-estree';
import type { Expression, JSXElement } from 'estree-jsx';
import { esmScope, handleTag, toEsm } from './utils';
import { componentsCode, jsxComponents, listCode } from '../../../shared/code-output';
import { hasCode } from '../../../shared/heading-id';
import { walkBranches } from '../../../shared/show';

export interface RehypeTocOptions {
  /**
   * Export the generated toc.
   *
   * - `true` (default): as an ESM export named `toc`.
   * - `false`: no TOC.
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

  return (tree, file) => {
    const items: (RehypeTOCItemType & { when: string[] })[] = [];

    walkBranches<Nodes>(tree, (node, when, parent) => {
      if (node.type !== 'element' || !HeadingTags.has(node.tagName)) return;
      const { id } = node.properties;
      const last = node.children.at(-1);
      if (typeof id !== 'string' || !last) return 'skip';

      const text = last.type === 'text' ? last : undefined;
      const noToc = text && handleTag(text.value, NoTocTag);
      if (typeof noToc === 'string') {
        text!.value = noToc;
        return 'skip';
      }
      const tocOnly = text && handleTag(text.value, TocOnlyTag);
      if (typeof tocOnly === 'string') {
        text!.value = tocOnly;
        const siblings = (parent as Root | Element).children;
        siblings.splice(siblings.indexOf(node), 1);
      }

      items.push({
        title: node,
        depth: Number(node.tagName[1]),
        url: `#${id}`,
        _step: getStep(node.properties),
        when,
      });
      return 'skip';
    });

    if (exportToc === false) return;
    if (exportToc.as === 'esm') {
      const runtime = file.data.unstable_runtimeOutputs === true;
      const titles: Expression[] = [];
      const list: { code: string; when: string[] }[] = [];
      const components = new Set<string>();
      /** whether an item reads the props of a page, beside its conditions */
      let dynamic = false;
      for (const { title, when, url, depth, _step } of items) {
        const { children } = toJsx(title);
        if (runtime) jsxComponents(children, components);
        const i = titles.push({
          type: 'JSXFragment',
          openingFragment: { type: 'JSXOpeningFragment' },
          closingFragment: { type: 'JSXClosingFragment' },
          children,
        });
        const id = file.data._headingIds?.[url.slice(1)];
        if (runtime && (id || hasCode(title))) dynamic = true;
        let code = `{depth: ${depth}, url: ${id ? `"#" + ${id}` : JSON.stringify(url)}`;
        if (_step !== undefined) code += `, _step: ${_step}`;
        list.push({ code: `${code}, title: _fumadocs${i - 1}}`, when });
      }
      const declaration = componentsCode(components, esmScope(tree as never));
      tree.children.push(
        toEsm(`export const ${exportToc.name} = ${listCode(list, dynamic, declaration)};`, titles),
      );
    } else {
      file.data.rehypeToc = items.map(({ when: _, ...item }) => item);
    }
  };
}

function toJsx(element: Element): JSXElement {
  const root = toEstree(element, {
    elementAttributeNameCase: 'react',
    stylePropertyNameCase: 'dom',
  });
  return (root.body[0] as { expression: JSXElement }).expression;
}
