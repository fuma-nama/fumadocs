import type { Root, Element, ElementContent } from 'hast';
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
  ShikiTransformer,
  ShikiTransformerContextMeta,
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

declare module 'shiki' {
  interface ShikiTransformerContextMeta {
    /** [Fumadocs: rehype-code] run async tasks after process */
    _fd_postprocess?: ((ctx: { highlighter: HighlighterCore }) => Promise<void>)[];
  }
}

export default function rehypeShikiFromHighlighter(
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
    lazy = true,
    ...rest
  } = options;

  function isLanguageLoaded(lang: string) {
    return isSpecialLang(lang) || highlighter.getLoadedLanguages().includes(lang);
  }

  async function onNode(
    tree: Root,
    node: Element,
    parsed: ShikiParsedData,
  ): Promise<Root | Element | undefined> {
    let { meta: metaString = '', lang = defaultLanguage, code } = parsed;
    if (!lang) return;

    if (!isLanguageLoaded(lang)) {
      if (lazy && lang in highlighter.getBundledLanguages()) {
        await highlighter.loadLanguage(lang as never);
      } else if (fallbackLanguage) {
        lang = fallbackLanguage;

        if (!isLanguageLoaded(fallbackLanguage))
          await highlighter.loadLanguage(fallbackLanguage as never);
      }
    }

    if (filterMetaString) {
      metaString = filterMetaString(metaString);
    }

    const cacheKey = `${lang}:${metaString}:${code}`;
    const cachedValue = cache?.get(cacheKey);

    if (cachedValue) {
      return cachedValue;
    }
    const transformers = rest.transformers ? [...rest.transformers] : [];
    let _fd_postprocess: ShikiTransformerContextMeta['_fd_postprocess'];
    transformers.push({
      enforce: 'post',
      root() {
        _fd_postprocess = this.meta._fd_postprocess;
      },
    });
    if (addLanguageClass) transformers.push(transformerAddLanguage(lang));

    const codeOptions: CodeToHastOptions = {
      ...rest,
      lang,
      structure: parsed.structure,
      transformers,
      meta: {
        ...rest.meta,
        __raw: metaString,
        ...parseMetaString?.(metaString, node, tree),
      },
    };

    if (stripEndNewline && code.endsWith('\n')) code = code.slice(0, -1);

    const fragment = highlighter.codeToHast(code, codeOptions);
    if (_fd_postprocess && _fd_postprocess.length > 0) {
      const ctx = { highlighter };
      await Promise.all(_fd_postprocess.map((v) => v(ctx)));
    }

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

    visit(tree, 'element', (node, index, parent) => {
      let parsed: ShikiParsedData | undefined;

      // needed for hast node replacement
      if (!parent || index == null) return;

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

function transformerAddLanguage(lang: string): ShikiTransformer {
  return {
    name: 'rehype-shiki:code-language-class',
    code(node) {
      this.addClassToHast(node, `language-${lang}`);
      return node;
    },
  };
}
