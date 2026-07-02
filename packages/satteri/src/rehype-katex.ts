import { defineHastPlugin } from 'satteri';
import { fromHtmlIsomorphic } from 'hast-util-from-html-isomorphic';
import type { Element, ElementContent, RootContent } from 'hast';
import katex, { type KatexOptions } from 'katex';

export type RehypeKatexOptions = Omit<KatexOptions, 'displayMode' | 'throwOnError'>;

function textContent(node: Element): string {
  const parts: string[] = [];
  const walk = (current: RootContent) => {
    if (current.type === 'text') parts.push(current.value);
    else if (current.type === 'element') {
      for (const child of current.children) walk(child);
    }
  };
  for (const child of node.children) walk(child);
  return parts.join('');
}

function renderKatex(value: string, options: RehypeKatexOptions, displayMode: boolean) {
  try {
    return katex.renderToString(value, {
      ...options,
      displayMode,
      throwOnError: true,
    });
  } catch (error) {
    try {
      return katex.renderToString(value, {
        ...options,
        displayMode,
        strict: 'ignore',
        throwOnError: false,
      });
    } catch {
      return null;
    }
  }
}

function toElements(html: string): ElementContent[] {
  const root = fromHtmlIsomorphic(html, { fragment: true });
  return root.children as ElementContent[];
}

export function rehypeKatex(options: RehypeKatexOptions = {}) {
  return defineHastPlugin({
    name: 'rehype-katex',
    element: {
      filter: ['code', 'pre'],
      visit(node, ctx) {
        const element = node as Element;
        const classes = Array.isArray(element.properties.className)
          ? element.properties.className
          : typeof element.properties.className === 'string'
            ? [element.properties.className]
            : [];

        const languageMath = classes.includes('language-math');
        const mathDisplay = classes.includes('math-display');
        const mathInline = classes.includes('math-inline');
        if (!languageMath && !mathDisplay && !mathInline) return;

        let scope = element;
        let displayMode = mathDisplay;

        if (
          element.tagName === 'code' &&
          languageMath &&
          ctx.parent(element)?.type === 'element' &&
          (ctx.parent(element) as Element).tagName === 'pre'
        ) {
          scope = ctx.parent(element) as Element;
          displayMode = true;
        }

        const value = textContent(scope);
        const rendered = renderKatex(value, options, displayMode);
        if (!rendered) {
          ctx.replaceNode(scope, {
            type: 'element',
            tagName: 'span',
            properties: {
              className: ['katex-error'],
              style: `color:${options.errorColor ?? '#cc0000'}`,
            },
            children: [{ type: 'text', value }],
          });
          return;
        }

        const children = toElements(rendered);
        if (scope === element) {
          if (children.length === 1) ctx.replaceNode(element, children[0]!);
          else {
            ctx.replaceNode(element, children[0]!);
            ctx.insertAfter(children[0]!, children.slice(1));
          }
          return;
        }

        if (children.length === 1) ctx.replaceNode(scope, children[0]!);
        else {
          ctx.replaceNode(scope, children[0]!);
          ctx.insertAfter(children[0]!, children.slice(1));
        }
      },
    },
  });
}
