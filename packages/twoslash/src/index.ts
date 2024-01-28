import type { ElementContent, Element } from 'hast';
import type { Code } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { toHast, defaultHandlers } from 'mdast-util-to-hast';
import type {
  ShikiTransformerContextCommon,
  ShikiTransformerContext,
  ShikiTransformer,
} from 'shiki';
import {
  transformerTwoslash as originalTransformer,
  type TransformerTwoslashIndexOptions,
} from '@shikijs/twoslash';

export function transformerTwoslash(
  options?: TransformerTwoslashIndexOptions,
): ShikiTransformer {
  return originalTransformer({
    explicitTrigger: true,
    ...options,
    rendererRich: {
      renderMarkdown,
      renderMarkdownInline,
      hast: {
        hoverCompose: ({ popup, token }) => [
          {
            type: 'element',
            tagName: 'Popup',
            properties: {},
            children: [
              popup,
              {
                type: 'element',
                tagName: 'PopupTrigger',
                properties: {},
                children: [token],
              },
            ],
          },
        ],
        popupDocs: {
          class: 'prose twoslash-popup-docs',
        },
        popupTypes: {
          class: 'nd-codeblock twoslash-popup-code',
        },
        nodesHighlight: {
          class: 'highlighted-word twoslash-highlighted',
        },
        hoverPopup: {
          tagName: 'PopupContent',
          children: (v) => v,
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
          const lang = node.lang || '';
          if (lang) {
            return this.codeToHast(node.value, {
              ...this.options,
              transformers: [],
              lang,
            }).children[0] as Element;
          }
          return defaultHandlers.code(state, node);
        },
      },
    }) as Element
  ).children;
}

function renderMarkdownInline(
  this: ShikiTransformerContext,
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
