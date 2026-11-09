import type {
  HastPluginInput,
  HastVisitorContext,
  MdxJsxAttributeNode,
  MdxJsxFlowElementHast,
  MdxTextExpression,
} from 'satteri';
import type { Element, ElementContent } from 'hast';
import { handleTag, jsxToSource, parse } from '@/utils';
import { listCode, showCondition, showConditions, staticContent } from '../../shared/code-output';
import { idCodeProperty } from '../../shared/heading-id';
import type { ExtraPluginHooks } from './compile';
import type { Analysis } from 'fumadocs-core/mdx-plugins/stringifier';

export interface RehypeTocOptions {
  exportToc?:
    | boolean
    | { as: 'data' }
    | {
        as: 'esm';
        name: string;
      };
  /** @defaultValue the analysis of the content source, or `runtime` */
  analysis?: Analysis;
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

export function rehypeToc({ exportToc = true, analysis }: RehypeTocOptions = {}): HastPluginInput &
  ExtraPluginHooks {
  const resolved = exportToc === true ? { as: 'esm' as const, name: 'toc' } : exportToc;
  const plugin: HastPluginInput & ExtraPluginHooks = () => {
    let isStatic = false;
    return {
      name: 'rehype-toc',
      before(_root: unknown, ctx: HastVisitorContext) {
        isStatic = (analysis ?? ctx.data._analysis) === 'static';
        if (resolved && resolved.as === 'data') ctx.data.rehypeToc ??= [];
      },
      after(_root: unknown, ctx: HastVisitorContext) {
        if (resolved && resolved.as === 'data')
          ctx.data._rehypeTocCode = listCode(ctx.data._rehypeTocItems ?? [], false);
      },
      element: {
        filter: HeadingTags,
        visit(node, ctx) {
          const element = node as Element;
          if (element.children.length === 0) return;

          const { id, [idCodeProperty]: idCode } = element.properties;
          if (typeof id !== 'string') return;
          const code = !isStatic && typeof idCode === 'string' ? idCode : undefined;

          let title = ctx.textContent(element);
          let children: ElementContent[] = element.children;
          const last = children[children.length - 1];
          const text = last?.type === 'text' ? last : undefined;
          const noToc = text && handleTag(text.value, NoTocTag);
          const tocOnly = noToc === false && handleTag(text!.value, TocOnlyTag);
          const stripped = typeof noToc === 'string' ? noToc : tocOnly;
          if (text && typeof stripped === 'string') {
            title = title.slice(0, title.length - text.value.length) + stripped;
            // visited nodes are frozen, the tag is stripped in a copy
            children = [...children.slice(0, -1), { ...text, value: stripped }];
          }

          if (typeof tocOnly === 'string') ctx.removeNode(element);
          else if (code) ctx.replaceNode(element, withIdCode(element, children, code));
          else if (text && typeof noToc === 'string') ctx.setProperty(text, 'value', noToc);
          if (typeof noToc === 'string') return;
          if (!resolved) return;

          const step =
            typeof element.properties['data-fd-step'] === 'number'
              ? element.properties['data-fd-step']
              : undefined;
          const when = isStatic ? [] : showConditions(element, ctx);
          let obj = '{';
          obj += `title: ${
            resolved.as === 'esm'
              ? jsxToSource({
                  type: 'root',
                  children: isStatic ? staticContent(children) : children,
                })
              : textCode(children)
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
      const isStatic = (analysis ?? data._analysis) === 'static';
      addExport(resolved.name, listCode(data._rehypeTocItems ?? [], isStatic));
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
function withIdCode(element: Element, children: ElementContent[], code: string) {
  const attributes: MdxJsxAttributeNode[] = [];
  for (const [name, value] of Object.entries(element.properties)) {
    if (name === idCodeProperty || value == null) continue;
    // space-separated, like `className`
    const expression =
      name === 'id' ? code : JSON.stringify(Array.isArray(value) ? value.join(' ') : value);
    attributes.push({
      type: 'mdxJsxAttribute',
      name,
      value: { type: 'mdxJsxAttributeValueExpression', value: expression },
    });
  }
  return {
    type: 'mdxJsxFlowElement',
    name: element.tagName,
    attributes,
    children,
  } as MdxJsxFlowElementHast;
}
