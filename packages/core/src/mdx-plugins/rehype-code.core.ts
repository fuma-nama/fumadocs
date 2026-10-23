import type { Element, ElementContent, Nodes, Root } from 'hast';
import {
  transformerNotationDiff,
  transformerNotationFocus,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from '@shikijs/transformers';
import type { Processor, Transformer } from 'unified';
import type {
  BuiltinLanguage,
  BuiltinTheme,
  CodeOptionsMeta,
  CodeOptionsThemes,
  CodeToHastOptions,
  CodeToHastOptionsCommon,
  HighlighterCore,
  LanguageInput,
  ShikiTransformer,
  TransformerOptions,
} from 'shiki';
import type { MdxJsxFlowElement } from 'mdast-util-mdx';
import {
  type InlineCodeParser,
  InlineCodeParsers,
  PreParser,
  type ShikiParsedData,
} from './rehype-code/parsers';
import type { CodeBlockIcon, IconOptions } from './transformer-icon';
import { transformerIcon } from './transformer-icon';
import { parseCodeBlockAttributes } from '@/mdx-plugins/codeblock-utils';
import { walk } from './utils';
import type { Awaitable } from '@/types';
import type { Highlighter } from '@/highlight';
import { createShikiHighlighter, type ShikiFactory } from '@/highlight/shiki';
import { defaultThemes } from '@/highlight/utils';

interface MapLike<K = unknown, V = unknown> {
  get: (key: K) => V | undefined;
  set: (key: K, value: V) => this;
}

export interface RehypeCodeFromHighlighterOptions {
  /**
   * The default language to use when is not specified
   *
   * @defaultValue 'plaintext'
   */
  defaultLanguage?: string;

  /**
   * `mdast-util-to-hast` adds a newline to the end of code blocks
   *
   * This option strips that newline from the code block
   *
   * @default true
   * @see https://github.com/syntax-tree/mdast-util-to-hast/blob/f511a93817b131fb73419bf7d24d73a5b8b0f0c2/lib/handlers/code.js#L22
   */
  stripEndNewline?: boolean;

  /**
   * Custom meta string parser
   * Return an object to merge with `meta`
   */
  parseMetaString?: (
    metaString: string,
    node: Element,
    tree: Root,
  ) => Record<string, unknown> | undefined | null;

  /**
   * Filter meta string before processing
   */
  filterMetaString?: (metaString: string) => string;

  /**
   * Highlight inline code blocks
   *
   * - `false`: disable inline code block highlighting
   * - `tailing-curly-colon`: highlight with `\`code{:lang}\``
   *
   * @see https://shiki.style/packages/rehype#inline-code
   * @default false
   */
  inline?: InlineCodeParser | false;

  /**
   * Custom map to cache transformed codeToHast result
   *
   * @default undefined
   */
  cache?: MapLike<string, Root>;

  /**
   * Chance to handle the error
   * If not provided, the error will be thrown
   */
  onError?: (error: unknown) => void;

  /**
   * Shiki transformers to create the highlighter with, when it is a function
   *
   * @defaultValue notation transformers of `@shikijs/transformers`
   */
  transformers?: ShikiTransformer[];

  /**
   * Add icon to code blocks, when the highlighter is a function
   */
  icon?: IconOptions | false;
}

/**
 * Highlight code blocks, a function is created with the transformers of Fumadocs.
 */
export function rehypeCodeFromHighlighter(
  highlighter: Highlighter | ((options: { transformers: ShikiTransformer[] }) => Highlighter),
  options: RehypeCodeFromHighlighterOptions = {},
): Transformer<Root, Root> {
  const {
    defaultLanguage,
    stripEndNewline = true,
    parseMetaString,
    filterMetaString,
    inline = false,
    cache,
    onError,
    transformers = defaultTransformers(),
    icon,
  } = { defaultLanguage: 'plaintext', parseMetaString: parseMeta, ...options };
  const instance =
    typeof highlighter === 'function'
      ? highlighter({
          transformers: icon === false ? transformers : [...transformers, transformerIcon(icon)],
        })
      : highlighter;

  async function onNode(
    tree: Root,
    node: Element,
    parsed: ShikiParsedData,
  ): Promise<Root | Element | undefined> {
    const { lang = defaultLanguage } = parsed;
    let { meta: metaString = '', code } = parsed;
    if (!lang) return;

    await instance.loadLanguage?.(lang);
    if (filterMetaString) {
      metaString = filterMetaString(metaString);
    }

    const cacheKey = cache ? `${lang}:${metaString}:${code}` : '';
    const cachedValue = cache?.get(cacheKey);
    if (cachedValue) {
      return cachedValue;
    }

    if (stripEndNewline && code.endsWith('\n')) code = code.slice(0, -1);
    const codeOptions = {
      lang,
      structure: parsed.structure,
      meta: { __raw: metaString, ...parseMetaString?.(metaString, node, tree) },
    };
    const fragment = await (instance.codeToHastAsync
      ? instance.codeToHastAsync(code, codeOptions)
      : instance.codeToHast(code, codeOptions));
    cache?.set(cacheKey, fragment);

    if (parsed.structure === 'classic') return fragment;
    return {
      type: 'element',
      tagName: 'code',
      properties: {
        class: 'shiki',
      },
      children: fragment.children as ElementContent[],
    };
  }

  return async (tree) => {
    const queue: Promise<void>[] = [];

    walk<Nodes>(tree, (node, index, parent) => {
      let parsed: ShikiParsedData | undefined;

      // needed for hast node replacement
      if (node.type !== 'element' || !parent || index == null) return;

      if (node.tagName === 'pre') {
        parsed = PreParser(tree, node);
      } else if (node.tagName === 'code' && inline) {
        parsed = InlineCodeParsers[inline](tree, node);
      } else {
        return;
      }

      if (!parsed) return 'skip';

      queue.push(
        onNode(tree, node, parsed)
          .then((fragment) => {
            if (fragment) parent.children[index] = fragment as never;
          })
          .catch((error) => {
            if (onError) {
              onError(error);
            } else {
              throw error;
            }
          }),
      );

      return 'skip';
    });

    if (queue.length > 0) {
      await Promise.all(queue);
    }
  };
}

function defaultTransformers(): ShikiTransformer[] {
  return [
    transformerNotationHighlight({
      matchAlgorithm: 'v3',
    }),
    transformerNotationWordHighlight({
      matchAlgorithm: 'v3',
    }),
    transformerNotationDiff({
      matchAlgorithm: 'v3',
    }),
    transformerNotationFocus({
      matchAlgorithm: 'v3',
    }),
  ];
}

function parseMeta(meta: string): Record<string, unknown> {
  const parsed = parseCodeBlockAttributes(meta, ['title', 'tab', 'noCopy', 'lineNumbers']);
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.attributes)) {
    if (k === 'noCopy') {
      data.allowCopy = 'false';
      continue;
    }

    if (k === 'lineNumbers') {
      data['data-line-numbers'] = true;
      if (typeof v === 'number') {
        data['data-line-numbers-start'] = v;
      }
      continue;
    }

    data[k] = v;
  }

  data.__raw = parsed.rest;
  return data;
}

declare module 'shiki' {
  interface ShikiTransformerContextMeta {
    /** [Fumadocs: rehype-code] run async tasks after process */
    _fd_postprocess?: ((ctx: { highlighter: HighlighterCore }) => Promise<void>)[];
  }

  interface ShikiTransformer {
    /** [Fumadocs: rehype-code] run async tasks before highlighting the code block */
    _fd_prepare?: (code: string, options: CodeToHastOptions) => Promise<void> | void;
  }
}

interface RehypeShikiExtraOptions extends RehypeCodeFromHighlighterOptions {
  /**
   * Add `language-*` class to code element
   *
   * @default false
   */
  addLanguageClass?: boolean;

  /**
   * The fallback language to use when specified language is not loaded, or not included in the bundle
   */
  fallbackLanguage?: string;

  /**
   * Load languages and themes on-demand.
   *
   * @default true
   */
  lazy?: boolean;
}

type RehypeShikiCoreOptions = CodeOptionsThemes<BuiltinTheme> &
  TransformerOptions &
  CodeOptionsMeta &
  RehypeShikiExtraOptions &
  Omit<CodeToHastOptionsCommon, 'lang'>;

export function rehypeCodeDefaultOptions(): RehypeCodeOptionsCommon {
  return {
    ...defaultThemes,
    defaultLanguage: 'plaintext',
    transformers: defaultTransformers(),
    parseMetaString: parseMeta,
  };
}

export type RehypeCodeOptionsCommon = RehypeShikiCoreOptions & {
  /**
   * Language names to include & preload.
   */
  langs?: Array<LanguageInput | BuiltinLanguage>;
  /**
   * Alias of languages
   * @example { 'my-lang': 'javascript' }
   */
  langAlias?: Record<string, string>;

  /**
   * Add icon to code blocks
   */
  icon?: IconOptions | false;

  /**
   * Wrap code blocks in `<Tab>` component when "tab" meta string presents
   *
   * @defaultValue true
   */
  tab?: boolean;
};

/**
 * @deprecated use `rehypeCodeFromHighlighter()` with `createShikiHighlighter()`
 */
export function createRehypeCode<
  Options extends Partial<RehypeCodeOptionsCommon> = Partial<RehypeCodeOptionsCommon>,
>(
  highlighterFactory:
    | ShikiFactory
    | ((options?: Options) => Awaitable<{
        highlighter: HighlighterCore;
        options: RehypeCodeOptionsCommon;
      }>),
) {
  async function initTransformer(_options?: Options) {
    let highlighter: HighlighterCore;
    let options: RehypeCodeOptionsCommon;
    if (typeof highlighterFactory === 'function') {
      const out = await highlighterFactory(_options);
      highlighter = out.highlighter;
      options = out.options;
    } else {
      // TODO: When newer Shiki supported it, register lang alias dynamically instead of creating new instance
      highlighter = _options?.langAlias
        ? await highlighterFactory.init(_options)
        : await highlighterFactory.getOrInit();
      options = (_options ?? {}) as RehypeCodeOptionsCommon;
    }

    const {
      langs,
      lazy = true,
      tab,
      addLanguageClass,
      fallbackLanguage,
      icon,
      transformers = [],
      defaultLanguage,
      stripEndNewline,
      parseMetaString,
      filterMetaString,
      inline,
      cache,
      onError,
      ...shikiOptions
    } = options;
    const [{ isSpecialLang }] = await Promise.all([
      import('shiki/core'),
      (langs || !lazy) &&
        highlighter.loadLanguage(
          ...((langs ?? Object.keys(highlighter.getBundledLanguages())) as never[]),
        ),
    ]);

    const extra: ShikiTransformer[] = [];
    if (tab !== false) extra.push(transformerTab());
    if (addLanguageClass) extra.push(transformerAddLanguage());

    return rehypeCodeFromHighlighter(
      ({ transformers }) => {
        const shiki = createShikiHighlighter(highlighter, {
          ...shikiOptions,
          fallbackLanguage,
          transformers,
        });
        if (fallbackLanguage) return shiki;

        return {
          ...shiki,
          async loadLanguage(lang) {
            await shiki.loadLanguage(lang);
            // without a fallback language, unknown languages fail like in Shiki
            if (!isSpecialLang(lang)) highlighter.getLanguage(lang);
          },
        };
      },
      {
        transformers: [...transformers, ...extra],
        icon,
        defaultLanguage,
        stripEndNewline,
        parseMetaString,
        filterMetaString,
        inline,
        cache,
        onError,
      },
    );
  }

  return function rehypeCode(this: Processor, _options?: Options): Transformer<Root, Root> {
    const transformer = initTransformer(_options);

    return async (tree, file) => {
      await (
        await transformer
      )(tree, file, () => undefined);
    };
  };
}

function transformerAddLanguage(): ShikiTransformer {
  return {
    name: 'rehype-shiki:code-language-class',
    code(node) {
      this.addClassToHast(node, `language-${this.options.lang}`);
      return node;
    },
  };
}

function transformerTab(): ShikiTransformer {
  return {
    name: 'rehype-code:tab',
    // @ts-expect-error -- types not compatible with MDX
    root(root) {
      const value = this.options.meta?.tab;
      if (typeof value !== 'string') return root;
      console.warn(
        '[Fumadocs] For `tab="value" in codeblocks, please use `remarkCodeTab` plugin instead.',
      );

      return {
        type: 'root',
        children: [
          {
            type: 'mdxJsxFlowElement',
            name: 'Tab',
            data: {
              _codeblock: true,
            },
            attributes: [{ type: 'mdxJsxAttribute', name: 'value', value }],
            children: root.children,
          } as MdxJsxFlowElement,
        ],
      };
    },
  };
}

export { type CodeBlockIcon, transformerIcon, transformerTab };
