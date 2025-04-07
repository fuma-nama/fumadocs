import type { Element, ElementContent } from 'hast';
import type { Code } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { defaultHandlers, toHast } from 'mdast-util-to-hast';
import type { ShikiTransformer, ShikiTransformerContextCommon } from 'shiki';
import {
  createTransformerFactory,
  type TransformerTwoslashIndexOptions,
  rendererRich,
} from '@shikijs/twoslash';
import {
  createTwoslasher,
  type TwoslashExecuteOptions,
  type TwoslashReturn,
} from 'twoslash';
import type { TwoslashTypesCache } from '@/cache-fs';

export interface TransformerTwoslashOptions
  extends TransformerTwoslashIndexOptions {
  typesCache?: TwoslashTypesCache;
}

// Since some internals of Shiki Twoslash are not documented
// This is highly inspired by https://github.com/shikijs/shiki/blob/main/packages/vitepress-twoslash
export function transformerTwoslash({
  typesCache,
  ...options
}: TransformerTwoslashOptions = {}): ShikiTransformer {
  const ignoreClass = 'nd-copy-ignore';
  const defaultTwoslasher = createTwoslasher(options.twoslashOptions);

  let twoslasher = defaultTwoslasher;
  // Wrap twoslasher with cache when `resultCache` is provided
  if (typesCache) {
    twoslasher = ((
      code: string,
      extension?: string,
      options?: TwoslashExecuteOptions,
    ): TwoslashReturn => {
      const cached = typesCache.read(code); // Restore cache
      if (cached) return cached;

      const twoslashResult = defaultTwoslasher(code, extension, options);
      typesCache.write(code, twoslashResult);
      return twoslashResult;
    }) as typeof defaultTwoslasher;
    twoslasher.getCacheMap = defaultTwoslasher.getCacheMap;
    typesCache?.init?.();
  }

  const renderer = rendererRich({
    classExtra: ignoreClass,
    renderMarkdown,
    renderMarkdownInline,
    ...options?.rendererRich,
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
        class: 'fd-codeblock prose-no-margin',
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
  });

  return createTransformerFactory(
    twoslasher,
    renderer,
  )({
    explicitTrigger: true,
    ...options,
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
