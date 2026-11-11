import type { Processor, Transformer } from 'unified';
import type { Root, Element, Nodes } from 'hast';
import { toEstree } from 'hast-util-to-estree';
import type { Expression, JSXElement } from 'estree-jsx';
import { esmScope, handleTag, toEsm } from './utils';
import {
  componentsCode,
  jsxComponents,
  listCode,
  type ListEntry,
} from '../../../shared/code-output';
import { isStaticOutput, walkBranches } from '../../../shared/show';
import { stepNumberCode } from '../../../shared/steps';

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
    /** `hidden` is a step that isn't in the TOC, which counts among the steps */
    const items: (RehypeTOCItemType & { when: string[]; hidden?: boolean })[] = [];

    walkBranches<Nodes>(tree, (node, when, parent) => {
      if (node.type !== 'element' || !HeadingTags.has(node.tagName)) return;
      const { id } = node.properties;
      const last = node.children.at(-1);
      if (typeof id !== 'string' || !last) return 'skip';

      const text = last.type === 'text' ? last : undefined;
      const item = {
        title: node,
        depth: Number(node.tagName[1]),
        url: `#${id}`,
        _step: getStep(node.properties),
        when,
      };
      const noToc = text && handleTag(text.value, NoTocTag);
      if (typeof noToc === 'string') {
        text!.value = noToc;
        if (item._step !== undefined) items.push({ ...item, hidden: true });
        return 'skip';
      }
      const tocOnly = text && handleTag(text.value, TocOnlyTag);
      if (typeof tocOnly === 'string') {
        text!.value = tocOnly;
        const siblings = (parent as Root | Element).children;
        siblings.splice(siblings.indexOf(node), 1);
      }

      items.push(item);
      return 'skip';
    });

    if (exportToc === false) return;
    if (exportToc.as === 'esm') {
      const titles: Expression[] = [];
      const list: ListEntry[] = [];
      const components = new Set<string>();
      const isStatic = isStaticOutput(file.data);
      // without branches, the number of a step among the steps of its list is the one that shows
      const numbers = file.data._show ? stepNumberCode() : undefined;
      for (const { title, when, url, depth, _step, hidden } of items) {
        const step =
          _step === undefined ? undefined : (numbers?.next(_step, depth) ?? String(_step));
        if (hidden) {
          if (numbers) list.push({ code: step!, when, run: true });
          continue;
        }
        const { children } = toJsx(title);
        jsxComponents(children, components);
        const i = titles.push({
          type: 'JSXFragment',
          openingFragment: { type: 'JSXOpeningFragment' },
          closingFragment: { type: 'JSXClosingFragment' },
          children,
        });
        const id = file.data._headingIds?.[url.slice(1)];
        let code = `{depth: ${depth}, url: ${id ? `"#" + ${id}` : JSON.stringify(url)}`;
        if (step) code += `, _step: ${step}`;
        list.push({ code: `${code}, title: _fumadocs${i - 1}}`, when });
      }
      // like in the content, the other components of titles are MDX components: without them, their content
      const declaration = componentsCode(
        components,
        esmScope(tree as never),
        'props.components ?? {}',
        '((props) => props.children)',
      );
      tree.children.push(
        toEsm(
          `export const ${exportToc.name} = ${listCode(list, isStatic, (numbers?.declaration ?? '') + declaration)};`,
          titles,
        ),
      );
    } else {
      file.data.rehypeToc = [];
      for (const { when: _, hidden, ...item } of items) if (!hidden) file.data.rehypeToc.push(item);
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
