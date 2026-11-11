import type { HastPluginInput, HastVisitorContext } from 'satteri';
import type { Element, ElementContent } from 'hast';
import { esmScope, handleTag, jsxToSource, parse } from '@/utils';
import { componentsCode, hasCode, jsxComponents, listCode } from '../../shared/code-output';
import { textParts } from '../../shared/heading-id';
import { showConditions } from '../../shared/show';
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
    /** the code of the items, a function of the props when they read props. In data mode, with text titles */
    _rehypeTocCode?: string;
  }
}

export function rehypeToc({ exportToc = true }: RehypeTocOptions = {}): HastPluginInput &
  ExtraPluginHooks {
  const resolved = exportToc === true ? { as: 'esm' as const, name: 'toc' } : exportToc;
  const plugin: HastPluginInput & ExtraPluginHooks = () => {
    const items: { code: string; when: string[] }[] = [];
    let runtime = false;
    /** whether an item reads the props of a page, beside its conditions */
    let dynamic = false;
    /** the components of titles */
    const components = new Set<string>();
    /** the code of the ESM nodes */
    const esm: string[] = [];
    return {
      name: 'rehype-toc',
      before(_root: unknown, ctx: HastVisitorContext) {
        runtime = ctx.data.unstable_runtimeOutputs === true;
        if (resolved && resolved.as === 'data') ctx.data.rehypeToc ??= [];
      },
      after(_root: unknown, ctx: HastVisitorContext) {
        if (!resolved) return;
        ctx.data._rehypeTocCode = listCode(
          items,
          dynamic,
          componentsCode(components, esmScope(esm)),
        );
      },
      mdxjsEsm(node: { value: string }) {
        esm.push(node.value);
      },
      element: {
        filter: HeadingTags,
        visit(node, ctx) {
          const element = node as Element;
          if (element.children.length === 0) return;

          const { id } = element.properties;
          if (typeof id !== 'string') return;
          const code = ctx.data._headingIds?.[id];

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
          else if (text && typeof noToc === 'string') ctx.setProperty(text, 'value', noToc);
          if (typeof noToc === 'string') return;
          if (!resolved) return;

          const step =
            typeof element.properties['data-fd-step'] === 'number'
              ? element.properties['data-fd-step']
              : undefined;
          const when = showConditions(element, ctx);
          const fromCode = runtime && hasCode(element);
          if (code || fromCode) dynamic = true;
          let titleCode: string;
          if (resolved.as === 'esm') {
            titleCode = jsxToSource({ type: 'root', children });
            if (runtime && /<[A-Z_$]/.test(titleCode)) jsxComponents(parse(titleCode), components);
          } else {
            // titles in data are text
            titleCode = fromCode
              ? `[${textParts(children)}].filter((v) => typeof v === "string" || typeof v === "number").join("")`
              : JSON.stringify(title);
          }
          let obj = `{title: ${titleCode}, url: ${code ? `"#" + ${code}` : JSON.stringify(`#${id}`)}, depth: ${element.tagName[1]}`;
          if (step !== undefined) obj += `, _step: ${step}`;
          items.push({ code: `${obj}}`, when });
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
    if (resolved && resolved.as === 'esm') addExport(resolved.name, data._rehypeTocCode ?? '[]');
  };
  return plugin;
}
