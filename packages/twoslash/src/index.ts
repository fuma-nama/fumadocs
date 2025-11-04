import type { Element, ElementContent } from 'hast';
import type { Code } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { defaultHandlers, toHast } from 'mdast-util-to-hast';
import type {
  ShikiTransformer,
  ShikiTransformerContext,
  ShikiTransformerContextCommon,
} from 'shiki';
import {
  createTransformerFactory,
  rendererRich,
  type TransformerTwoslashIndexOptions,
  type TwoslashTypesCache,
} from '@shikijs/twoslash';
import { createTwoslasher, type TwoslashInstance } from 'twoslash';

export type { TwoslashTypesCache };

export type TransformerTwoslashOptions = TransformerTwoslashIndexOptions;

let cachedInstance: TwoslashInstance | undefined;

// This is highly inspired by https://github.com/shikijs/shiki/blob/main/packages/vitepress-twoslash
export function transformerTwoslash(
  options: TransformerTwoslashOptions = {},
): ShikiTransformer {
  const ignoreClass = 'nd-copy-ignore';

  // lazy load Twoslash instance so it works on serverless platforms
  function lazyInstance(): TwoslashInstance {
    function get() {
      return (cachedInstance ??= createTwoslasher(options.twoslashOptions));
    }

    const wrapper: TwoslashInstance = (...args) => get()(...args);

    wrapper.getCacheMap = () => get().getCacheMap();
    return wrapper;
  }

  const renderer = rendererRich({
    classExtra: ignoreClass,
    queryRendering: 'line',
    renderMarkdown,
    renderMarkdownInline,
    ...options?.rendererRich,
    hast: {
      hoverToken: {
        tagName: 'Popup',
      },
      hoverPopup: {
        tagName: 'PopupContent',
        properties: {
          class: ignoreClass,
        },
      },
      hoverCompose: ({ popup, token }) => [
        popup,
        {
          type: 'element',
          tagName: 'PopupTrigger',
          properties: {},
          children: [token],
        },
      ],
      popupDocs: {
        class: 'prose twoslash-popup-docs',
      },
      popupTypes: {
        tagName: 'div',
        class: 'twoslash shiki fd-codeblock prose-no-margin',
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

  const fn = renderer.lineQuery!;
  renderer.lineQuery = function (this: ShikiTransformerContext, ...args) {
    const result = fn.call(this, ...args);
    // this may break if Shiki updates, need more attention
    // @ts-expect-error -- extract offset
    const child = result[0].children[0];
    // @ts-expect-error -- attend offset as span
    result[0].children[0] = {
      type: 'element',
      tagName: 'span',
      children: [child],
    };
    return result;
  };
  return createTransformerFactory(
    lazyInstance(),
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
