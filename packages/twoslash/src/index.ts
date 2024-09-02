import type { ElementContent, Element } from 'hast';
import type { Code } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { toHast, defaultHandlers } from 'mdast-util-to-hast';
import type { ShikiTransformerContextCommon, ShikiTransformer } from 'shiki';
import {
  transformerTwoslash as originalTransformer,
  type TransformerTwoslashIndexOptions,
} from '@shikijs/twoslash';

export function transformerTwoslash(
  options?: TransformerTwoslashIndexOptions,
): ShikiTransformer {
  const ignoreClass = 'nd-copy-ignore';

  return originalTransformer({
    explicitTrigger: true,
    ...options,
    rendererRich: {
      classExtra: ignoreClass,
      renderMarkdown,
      renderMarkdownInline,
      hast: {
        hoverToken: {
          tagName: 'Popup',
        },
        hoverPopup: {
          tagName: 'PopupContent',
        },
        hoverCompose: ({ popup, token }) => [
          popup,
          {
            type: 'element',
            tagName: 'PopupTrigger',
            properties: {
              asChild: true,
            },
            children: [
              {
                type: 'element',
                tagName: 'span',
                properties: {
                  class: 'twoslash-hover',
                },
                children: [token],
              },
            ],
          },
        ],
        popupDocs: {
          class: 'prose twoslash-popup-docs',
        },
        popupTypes: {
          tagName: 'div',
          class: 'shiki prose-no-margin',
          children: (v) => {
            if (
              v.length === 1 &&
              v[0].type === 'element' &&
              v[0].tagName === 'pre'
            )
              return v;

            return [
              {
                type: 'element',
                tagName: 'code',
                properties: {
                  class: 'twoslash-popup-code',
                },
                children: v,
              },
            ];
          },
        },
        popupDocsTags: {
          class: 'prose twoslash-popup-docs twoslash-popup-docs-tags',
        },
        nodesHighlight: {
          class: 'highlighted-word twoslash-highlighted',
        },
        ...options?.rendererRich?.hast,
      },
      ...options?.rendererRich,
    },
  });
}

function renderMarkdown(
  this: ShikiTransformerContextCommon,
  md: string,
): ElementContent[] {
  const mdast = fromMarkdown(
    md.replace(/{@link (?<link>[^}]*)}/g, '$1'), // replace jsdoc links
    { mdastExtensions: [gfmFromMarkdown()] },
  );

  return (
    toHast(mdast, {
      handlers: {
        code: (state, node: Code) => {
          if (node.lang) {
            return this.codeToHast(node.value, {
              ...this.options,
              transformers: [],
              meta: {
                __raw: node.meta ?? undefined,
              },
              lang: node.lang,
            }).children[0] as Element;
          }

          return defaultHandlers.code(state, node);
        },
      },
    }) as Element
  ).children;
}

function renderMarkdownInline(
  this: ShikiTransformerContextCommon,
  md: string,
  context?: string,
): ElementContent[] {
  const text =
    context === 'tag:param' ? md.replace(/^(?<link>[\w$-]+)/, '`$1` ') : md;

  const children = renderMarkdown.call(this, text);
  if (
    children.length === 1 &&
    children[0].type === 'element' &&
    children[0].tagName === 'p'
  )
    return children[0].children;
  return children;
}
