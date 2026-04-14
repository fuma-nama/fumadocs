import type { Root, Element } from 'hast';
import type { Transformer } from 'unified';
import { isSpecialLang } from 'shiki/core';
import { visit } from 'unist-util-visit';
import {
  type InlineCodeParser,
  InlineCodeParsers,
  PreParser,
  type ShikiParsedData,
} from './parsers';
import type {
  BuiltinTheme,
  CodeOptionsMeta,
  CodeOptionsThemes,
  CodeToHastOptions,
  CodeToHastOptionsCommon,
  HighlighterCore,
  TransformerOptions,
} from 'shiki';

export interface MapLike<K = unknown, V = unknown> {
  get: (key: K) => V | undefined;
  set: (key: K, value: V) => this;
}

export interface RehypeShikiExtraOptions {
  /**
   * Add `language-*` class to code element
   *
   * @default false
   */
  addLanguageClass?: boolean;

  /**
   * The default language to use when is not specified
   */
  defaultLanguage?: string;

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
}

export type RehypeShikiCoreOptions = CodeOptionsThemes<BuiltinTheme> &
  TransformerOptions &
  CodeOptionsMeta &
  RehypeShikiExtraOptions &
  Omit<CodeToHastOptionsCommon, 'lang'>;

function rehypeShikiFromHighlighter(
  highlighter: HighlighterCore,
  options: RehypeShikiCoreOptions,
): Transformer<Root, Root> {
  const {
    addLanguageClass = false,
    parseMetaString,
    filterMetaString,
    cache,
    defaultLanguage,
    fallbackLanguage,
    onError,
    stripEndNewline = true,
    inline = false,
    lazy = false,
    ...rest
  } = options;

  function highlight(
    lang: string,
    code: string,
    metaString = '',
    tree: Root,
    node: Element,
  ): Root | undefined {
    if (filterMetaString) {
      metaString = filterMetaString(metaString);
    }

    const cacheKey = `${lang}:${metaString}:${code}`;
    const cachedValue = cache?.get(cacheKey);

    if (cachedValue) {
      return cachedValue;
    }

    const codeOptions: CodeToHastOptions = {
      ...rest,
      lang,
      meta: {
        ...rest.meta,
        __raw: metaString,
        ...parseMetaString?.(metaString, node, tree),
      },
    };

    if (addLanguageClass) {
      // always construct a new array, avoid adding the transformer repeatedly
      codeOptions.transformers = [
        ...(codeOptions.transformers ?? []),
        {
          name: 'rehype-shiki:code-language-class',
          code(node) {
            this.addClassToHast(node, `language-${lang}`);
            return node;
          },
        },
      ];
    }

    if (stripEndNewline && code.endsWith('\n')) code = code.slice(0, -1);

    try {
      const fragment = highlighter.codeToHast(code, codeOptions);
      cache?.set(cacheKey, fragment);
      return fragment;
    } catch (error) {
      if (onError) onError(error);
      else throw error;
    }
  }

  async function onNode(tree: Root, node: Element, parsed: ShikiParsedData) {
    let lang = parsed.lang ?? defaultLanguage;
    if (!lang) return;

    const isLoaded = isSpecialLang(lang) || highlighter.getLoadedLanguages().includes(lang);

    if (lazy && !isLoaded && lang in highlighter.getBundledLanguages()) {
      await highlighter.loadLanguage(lang as never);
    } else if (!isLoaded && fallbackLanguage) {
      lang = fallbackLanguage;
      await highlighter.loadLanguage(fallbackLanguage as never);
    }

    const fragment = highlight(lang, parsed.code, parsed.meta, tree, node);
    if (!fragment) return;

    if (parsed.type === 'inline') {
      const head = fragment.children[0];
      if (head.type === 'element' && head.tagName === 'pre') {
        head.tagName = 'span';
      }
    }

    return fragment;
  }

  return async (tree) => {
    const queue: Promise<void>[] = [];

    visit(tree, 'element', (node, index, parent) => {
      let parsed: ShikiParsedData | undefined;

      // needed for hast node replacement
      if (!parent || index == null) return;

      if (node.tagName === 'pre') {
        parsed = PreParser(tree, node);
      } else if (node.tagName === 'code' && inline) {
        parsed = InlineCodeParsers[inline](tree, node);
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

export default rehypeShikiFromHighlighter;
