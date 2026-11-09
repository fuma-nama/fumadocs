import type { Processor, Transformer } from 'unified';
import type { Root, Element, ElementContent, Nodes } from 'hast';
import { toEstree } from 'hast-util-to-estree';
import type { Expression, JSXElement } from 'estree-jsx';
import { handleTag, parseExpression, toEsm } from './utils';
import { listCode, showCondition, staticContent } from '../../../shared/code-output';
import type { Analysis } from './stringifier';
import { idCodeProperty } from '../../../shared/heading-id';

export interface RehypeTocOptions {
  /**
   * Export the generated toc.
   *
   * - `true` (default): as an ESM export named `toc`.
   * - `false`: no TOC, IDs from code are still rendered into headings.
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

  /** @defaultValue the analysis of the content source, or `static` */
  analysis?: Analysis;
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
  { exportToc = true, analysis }: RehypeTocOptions = {},
): Transformer<Root, Root> {
  if (exportToc === true) {
    exportToc = { as: 'esm', name: 'toc' };
  }

  return (tree, file) => {
    const isStatic = (analysis ?? file.data._analysis) !== 'runtime';
    const items: (RehypeTOCItemType & { when: string[]; code?: string })[] = [];

    const visit = (nodes: Nodes[], when: string[]) => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (!('children' in node)) continue;
        if (node.type !== 'element' || !HeadingTags.has(node.tagName) || !node.children.length) {
          const condition = showCondition(node);
          visit(node.children, condition ? [...when, condition] : when);
          continue;
        }

        const { id, [idCodeProperty]: idCode } = node.properties;
        if (typeof id !== 'string') continue;
        if (idCode !== undefined) delete node.properties[idCodeProperty];
        const code = !isStatic && typeof idCode === 'string' ? idCode : undefined;
        const last = node.children[node.children.length - 1];
        const text = last.type === 'text' ? last : undefined;
        const noToc = text && handleTag(text.value, NoTocTag);
        if (typeof noToc === 'string') {
          text!.value = noToc;
          if (code) nodes[i] = withIdCode(node, code);
          continue;
        }
        const tocOnly = text && handleTag(text.value, TocOnlyTag);
        if (typeof tocOnly === 'string') {
          text!.value = tocOnly;
          nodes.splice(i--, 1);
        } else if (code) {
          nodes[i] = withIdCode(node, code);
        }

        items.push({
          title: node,
          depth: Number(node.tagName[1]),
          url: `#${id}`,
          _step: getStep(node.properties),
          when,
          code,
        });
      }
    };
    visit(tree.children, []);

    if (exportToc === false) return;
    if (exportToc.as === 'esm') {
      const titles: Expression[] = [];
      const list: { code: string; when: string[] }[] = [];
      for (const { title, when, url, depth, _step, code: id } of items) {
        const i = titles.push({
          type: 'JSXFragment',
          openingFragment: { type: 'JSXOpeningFragment' },
          closingFragment: { type: 'JSXClosingFragment' },
          children: toJsx(isStatic ? { ...title, children: staticContent(title.children) } : title)
            .children,
        });
        let code = `{depth: ${depth}, url: ${id && !isStatic ? `"#" + ${id}` : JSON.stringify(url)}`;
        if (_step !== undefined) code += `, _step: ${_step}`;
        list.push({ code: `${code}, title: _fumadocs${i - 1}}`, when: isStatic ? [] : when });
      }
      tree.children.push(
        toEsm(`export const ${exportToc.name} = ${listCode(list, isStatic)};`, titles),
      );
    } else {
      file.data.rehypeToc = items.map(({ when: _, code: __, ...item }) => item);
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

/** the heading with its ID rendered from code, its JSX maps to MDX components like Markdown */
function withIdCode(heading: Element, code: string): ElementContent {
  const element = toJsx(heading);
  for (const attribute of element.openingElement.attributes)
    if (attribute.type === 'JSXAttribute' && attribute.name.name === 'id')
      attribute.value = { type: 'JSXExpressionContainer', expression: parseExpression(code) };
  return {
    type: 'mdxFlowExpression',
    value: '',
    data: {
      estree: {
        type: 'Program',
        sourceType: 'module',
        body: [{ type: 'ExpressionStatement', expression: element }],
      },
    },
  };
}
