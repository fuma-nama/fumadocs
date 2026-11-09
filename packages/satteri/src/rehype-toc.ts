import type { HastPluginInput, HastVisitorContext, MdxTextExpression } from 'satteri';
import type { Element, ElementContent } from 'hast';
import { handleTag, jsxToSource, parse, showConditions } from '@/utils';
import { guardedArray, showCondition } from '../../shared/code-output';
import type { ExtraPluginHooks } from './compile';

export interface RehypeTocOptions {
  exportToc?:
    | boolean
    | { as: 'data' }
    | {
        as: 'esm';
        name: string;
      };
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
    /** whether the items read render scope (`props`) */
    _rehypeTocDynamic?: boolean;
    /** in data mode, the code of the items as a function of the props when they read it, titles are text */
    _rehypeTocCode?: string;
  }
}

export function rehypeToc({ exportToc = true }: RehypeTocOptions = {}): HastPluginInput &
  ExtraPluginHooks {
  if (exportToc === false) {
    return () => undefined;
  }

  const resolved = exportToc === true ? { as: 'esm' as const, name: 'toc' } : exportToc;
  const plugin: HastPluginInput & ExtraPluginHooks = () => {
    return {
      name: 'rehype-toc',
      before(_root: unknown, ctx: HastVisitorContext) {
        if (resolved.as === 'data') ctx.data.rehypeToc ??= [];
      },
      after(_root: unknown, ctx: HastVisitorContext) {
        if (resolved.as === 'data' && ctx.data._rehypeTocDynamic)
          ctx.data._rehypeTocCode = `(props) => ${guardedArray(ctx.data._rehypeTocItems ?? [])}`;
      },
      element: {
        filter: HeadingTags,
        visit(node, ctx) {
          const element = node as Element;
          if (element.children.length === 0) return;

          const id = element.properties.id;
          if (typeof id !== 'string') return;

          let isTocOnly = false;
          let title = ctx.textContent(element);
          let titleChildren: ElementContent[] = element.children;
          const last = element.children[element.children.length - 1];
          if (last?.type === 'text') {
            const noToc = handleTag(last.value, NoTocTag);
            if (noToc !== false) {
              ctx.setProperty(last, 'value', noToc);
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

          const step =
            typeof element.properties['data-fd-step'] === 'number'
              ? element.properties['data-fd-step']
              : undefined;
          const when = showConditions(element, ctx);
          if (when.length > 0 || hasExpression(titleChildren)) ctx.data._rehypeTocDynamic = true;
          let obj = '{';
          obj += `title: ${
            resolved.as === 'esm'
              ? jsxToSource({ type: 'root', children: titleChildren })
              : textCode(titleChildren)
          },`;
          obj += `url: ${JSON.stringify(`#${id}`)},`;
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
    if (resolved.as === 'esm') {
      const list = guardedArray(data._rehypeTocItems ?? []);
      addExport(resolved.name, data._rehypeTocDynamic ? `(props) => ${list}` : list);
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
        // a comment renders nothing
        if (parse(node.value).body.length > 0) push(`(${node.value})`);
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

/** whether content has authored expressions, read when rendering */
function hasExpression(nodes: readonly { type: string; children?: unknown[] }[]): boolean {
  return nodes.some(
    (node) =>
      node.type === 'mdxTextExpression' ||
      showCondition(node) !== undefined ||
      (node.children !== undefined && hasExpression(node.children as typeof nodes)),
  );
}
