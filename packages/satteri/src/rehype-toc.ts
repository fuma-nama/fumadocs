import type {
  HastPluginInput,
  HastVisitorContext,
  MdxJsxAttributeNode,
  MdxJsxFlowElementHast,
  MdxTextExpression,
} from 'satteri';
import type { Element, ElementContent } from 'hast';
import { handleTag, jsxToSource, parse } from '@/utils';
import {
  guardedArray,
  showCondition,
  showConditions,
  staticContent,
} from '../../shared/code-output';
import { idCodeProperty } from '../../shared/heading-id';
import type { ExtraPluginHooks } from './compile';
import type { OutputMode } from 'fumadocs-core/mdx-plugins/stringifier';

export interface RehypeTocOptions {
  exportToc?:
    | boolean
    | { as: 'data' }
    | {
        as: 'esm';
        name: string;
      };
  /** @defaultValue 'runtime' */
  output?: OutputMode;
}

export interface RehypeTocItemType {
  title: string;
  url: string;
  depth: number;
  _step?: number;
}

export interface RehypeTocESMItemType {
  title: Element;
  url: string;
  depth: number;
  _step?: number;
}

const TocOnlyTag = '[toc]';
const NoTocTag = '[!toc]';
const HeadingTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

declare module 'satteri' {
  interface DataMap {
    /** the code of items with the conditions of their branches, exported by `compileMdx` */
    _rehypeTocItems?: { code: string; when: string[] }[];
    /** in data mode, the code of the items as a function of the props, titles are text */
    _rehypeTocCode?: string;
  }
}

export function rehypeToc({ exportToc = true, output }: RehypeTocOptions = {}): HastPluginInput &
  ExtraPluginHooks {
  const resolved = exportToc === true ? { as: 'esm' as const, name: 'toc' } : exportToc;
  const plugin: HastPluginInput & ExtraPluginHooks = () => {
    return {
      name: 'rehype-toc',
      before(_root: unknown, ctx: HastVisitorContext) {
        if (resolved && resolved.as === 'data') ctx.data.rehypeToc ??= [];
      },
      after(_root: unknown, ctx: HastVisitorContext) {
        if (resolved && resolved.as === 'data')
          ctx.data._rehypeTocCode = `(props) => ${guardedArray(ctx.data._rehypeTocItems ?? [])}`;
      },
      element: {
        filter: HeadingTags,
        visit(node, ctx) {
          const element = node as Element;
          if (element.children.length === 0) return;

          const { id, [idCodeProperty]: idCode } = element.properties;
          if (typeof id !== 'string') return;
          const code = typeof idCode === 'string' ? idCode : undefined;

          let isTocOnly = false;
          let title = ctx.textContent(element);
          let titleChildren: ElementContent[] = element.children;
          const last = element.children[element.children.length - 1];
          if (last?.type === 'text') {
            const noToc = handleTag(last.value, NoTocTag);
            if (noToc !== false) {
              if (code)
                ctx.replaceNode(
                  element,
                  withIdCode(
                    element,
                    [...element.children.slice(0, -1), { ...last, value: noToc }],
                    code,
                  ),
                );
              else ctx.setProperty(last, 'value', noToc);
              return;
            }

            const tocOnly = handleTag(last.value, TocOnlyTag);
            if (tocOnly !== false) {
              isTocOnly = true;
              title = title.slice(0, title.length - last.value.length) + tocOnly;
              // the element is removed below, so strip the tag in a copy for
              // `jsxToSource()` — visited nodes are frozen anyway
              titleChildren = [...element.children.slice(0, -1), { ...last, value: tocOnly }];
            }
          }

          if (isTocOnly) ctx.removeNode(element);
          else if (code) ctx.replaceNode(element, withIdCode(element, titleChildren, code));
          if (!resolved) return;

          const step =
            typeof element.properties['data-fd-step'] === 'number'
              ? element.properties['data-fd-step']
              : undefined;
          const isStatic = output === 'static';
          const when = isStatic ? [] : showConditions(element, ctx);
          let obj = '{';
          obj += `title: ${
            resolved.as === 'esm'
              ? jsxToSource({
                  type: 'root',
                  children: isStatic ? staticContent(titleChildren) : titleChildren,
                })
              : textCode(titleChildren)
          },`;
          obj += `url: ${code && !isStatic ? `"#" + ${code}` : JSON.stringify(`#${id}`)},`;
          obj += `depth: ${JSON.stringify(Number(element.tagName[1]))},`;
          if (step !== undefined) obj += `_step: ${JSON.stringify(step)},`;
          obj += '}';
          (ctx.data._rehypeTocItems ??= []).push({ code: obj, when });
          if (resolved.as === 'esm') return;

          (ctx.data.rehypeToc ??= []).push({
            title,
            depth: Number(element.tagName[1]),
            url: `#${id}`,
            _step: step,
          });
        },
      },
    };
  };
  plugin.collectExports = ({ data, addExport }) => {
    if (resolved && resolved.as === 'esm') {
      const list = guardedArray(data._rehypeTocItems ?? []);
      addExport(resolved.name, output === 'static' ? list : `(props) => ${list}`);
    }
  };
  return plugin;
}

/** the text content as code, authored expressions are values */
function textCode(nodes: readonly ElementContent[]): string {
  const parts: string[] = [];
  let text = '';
  const push = (code: string) => {
    if (text || parts.length === 0) parts.push(JSON.stringify(text));
    parts.push(code);
    text = '';
  };
  const visit = (nodes: readonly (ElementContent | MdxTextExpression)[]) => {
    for (const node of nodes) {
      if (node.type === 'mdxTextExpression') {
        // comments render nothing, so do booleans and nullish values in React
        if (parse(node.value).body.length > 0)
          push(`((v) => typeof v === "string" || typeof v === "number" ? v : "")(${node.value})`);
      } else if ('children' in node) {
        const when = showCondition(node);
        if (when) push(`((${when}) ? ${textCode(node.children)} : "")`);
        else visit(node.children);
      } else if ('value' in node) text += node.value;
    }
  };
  visit(nodes);
  if (text || parts.length === 0) parts.push(JSON.stringify(text));
  return parts.join(' + ');
}

/** the heading with its ID rendered from code, Sätteri maps JSX of Markdown elements to MDX components */
function withIdCode(
  element: Element,
  children: ElementContent[],
  code: string,
): MdxJsxFlowElementHast {
  const attributes: MdxJsxAttributeNode[] = [];
  for (const [name, value] of Object.entries(element.properties)) {
    if (name === idCodeProperty || value == null || value === false) continue;
    attributes.push({
      type: 'mdxJsxAttribute',
      name,
      value:
        name === 'id'
          ? { type: 'mdxJsxAttributeValueExpression', value: code }
          : value === true
            ? null
            : {
                type: 'mdxJsxAttributeValueExpression',
                // space-separated, like `className`
                value: JSON.stringify(Array.isArray(value) ? value.join(' ') : value),
              },
    });
  }
  return {
    type: 'mdxJsxFlowElement',
    name: element.tagName,
    attributes,
    children,
  } as MdxJsxFlowElementHast;
}
