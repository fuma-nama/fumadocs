import type { Element, ElementContent } from 'hast';
import type { Code } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { defaultHandlers, toHast } from 'mdast-util-to-hast';
import type {
  ShikiTransformer,
  ShikiTransformerContext,
  ShikiTransformerContextCommon,
} from 'shiki';
import { ShikiError } from 'shiki/core';
import {
  createTransformerFactory,
  defaultTwoslashOptions,
  rendererRich,
  type RendererRichOptions,
  type TransformerTwoslashOptions as TransformerTwoslashCoreOptions,
  type TwoslashTypesCache,
} from '@shikijs/twoslash/core';
import { createTwoslasher, type Twoslasher, type TwoslasherOptions } from './twoslasher';

export type { TwoslashTypesCache, TwoslasherOptions };

export interface TransformerTwoslashOptions extends Omit<
  TransformerTwoslashCoreOptions,
  'twoslashOptions' | 'twoslasher'
> {
  twoslashOptions?: TwoslasherOptions;
  /**
   * Options for the rich renderer.
   */
  rendererRich?: RendererRichOptions;
}

let cachedInstance: Twoslasher | undefined;

// This is highly inspired by https://github.com/shikijs/shiki/blob/main/packages/vitepress-twoslash
/**
 * This transformer **must** be used with the `rehype-code` plugin of Fumadocs.
 */
export function transformerTwoslash(_options: TransformerTwoslashOptions = {}): ShikiTransformer {
  const ignoreClass = 'nd-copy-ignore';
  const { twoslashOptions, rendererRich: rendererOptions, ...rest } = _options;
  const { langs = ['ts', 'tsx'], typesCache } = rest;

  // lazy load Twoslash instance so it works on serverless platforms
  function getInstance(): Twoslasher {
    return (cachedInstance ??= createTwoslasher(twoslashOptions));
  }
  const lazyInstance: Twoslasher = (...args) => getInstance()(...args);
  lazyInstance.getCacheMap = () => undefined;
  lazyInstance.prepare = (...args) => getInstance().prepare(...args);
  // Shiki defaults to compiler options in TypeScript enum values, which `tsconfig.json` doesn't accept
  const { compilerOptions: _, ...executeOptions } = defaultTwoslashOptions();

  const renderer = rendererRich({
    classExtra: ignoreClass,
    queryRendering: 'line',
    renderMarkdown,
    renderMarkdownInline,
    ...rendererOptions,
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
          if (v.length === 1 && v[0].type === 'element' && v[0].tagName === 'pre') return v;

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
      ...rendererOptions?.hast,
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
  const transformer = createTransformerFactory(
    lazyInstance,
    renderer,
  )({
    explicitTrigger: true,
    twoslashOptions: executeOptions,
    ...rest,
  });

  // analyze the code blocks of documents compiled concurrently in one batch, see `Twoslasher.prepare`
  transformer._fd_prepare = (code, options) => {
    const lang = options.lang === 'typescript' ? 'ts' : options.lang;
    const meta = options.meta?.__raw ?? '';
    if (!langs.includes(lang) || !/\btwoslash\b/.test(meta) || /no-?twoslash/.test(meta)) return;
    if (typesCache) {
      code = typesCache.preprocess?.(code, lang) ?? code;
      if (typesCache.read(code, lang)) return;
    }
    return lazyInstance.prepare(code, lang, executeOptions);
  };
  return transformer;
}

function renderMarkdown(this: ShikiTransformerContextCommon, md: string): ElementContent[] {
  // replace jsdoc links
  const mdast = fromMarkdown(md.replace(/{@link (?<link>[^}]*)}/g, '$1'));

  const onCode = (lang: string, node: Code) => {
    return this.codeToHast(node.value, {
      ...this.options,
      transformers: [],
      meta: node.meta
        ? {
            __raw: node.meta,
          }
        : {},
      lang,
    }).children[0] as Element;
  };

  return (
    toHast(mdast, {
      handlers: {
        code: (state, node: Code) => {
          const lang = node.lang;
          if (!lang) return defaultHandlers.code(state, node);

          try {
            return onCode(lang, node);
          } catch (e) {
            const def = defaultHandlers.code(state, node);

            if (e instanceof ShikiError) {
              this.meta._fd_postprocess ??= [];
              this.meta._fd_postprocess.push(async ({ highlighter }) => {
                await highlighter.loadLanguage(lang as never);
                Object.assign(def, onCode(lang, node));
              });

              return def;
            }

            if (e instanceof Error) {
              console.error(
                `[fumadocs-twoslash] encountered an error when highlighting codeblock in a Twoslash popup: ${e.message}`,
              );
            }

            return def;
          }
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
  const text = context === 'tag:param' ? md.replace(/^(?<link>[\w$-]+)/, '`$1` ') : md;

  const children = renderMarkdown.call(this, text);
  if (children.length === 1 && children[0].type === 'element' && children[0].tagName === 'p')
    return children[0].children;
  return children;
}
