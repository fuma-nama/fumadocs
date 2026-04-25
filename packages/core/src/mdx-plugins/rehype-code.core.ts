import type { Root } from 'hast';
import rehypeShikiFromHighlighter, { type RehypeShikiCoreOptions } from './rehype-code/shiki';
import {
  transformerNotationDiff,
  transformerNotationFocus,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from '@shikijs/transformers';
import type { Processor, Transformer } from 'unified';
import type { BuiltinLanguage, HighlighterCore, LanguageInput, ShikiTransformer } from 'shiki';
import type { MdxJsxFlowElement } from 'mdast-util-mdx';
import type { CodeBlockIcon, IconOptions } from './transformer-icon';
import { transformerIcon } from './transformer-icon';
import { parseCodeBlockAttributes } from '@/mdx-plugins/codeblock-utils';
import type { Awaitable } from '@/types';
import type { ShikiFactory } from '@/highlight/shiki';
import { defaultThemes, getRequiredThemes } from '@/highlight/utils';

export function rehypeCodeDefaultOptions(): RehypeCodeOptionsCommon {
  return {
    ...defaultThemes,
    defaultLanguage: 'plaintext',
    transformers: [
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
    ],
    parseMetaString(meta) {
      const parsed = parseCodeBlockAttributes(meta, ['title', 'tab']);
      const data: Record<string, unknown> = parsed.attributes;
      parsed.rest = parseLineNumber(parsed.rest, data);

      data.__raw = parsed.rest;
      return data;
    },
  };
}

function parseLineNumber(str: string, data: Record<string, unknown>) {
  return str.replace(/lineNumbers=(\d+)|lineNumbers/, (_, ...args) => {
    data['data-line-numbers'] = true;

    if (args[0] !== undefined) data['data-line-numbers-start'] = Number(args[0]);

    return '';
  });
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

    const transformers: ShikiTransformer[] = options.transformers ? [...options.transformers] : [];

    if (options.icon !== false) {
      transformers.push(transformerIcon(options.icon));
    }

    if (options.tab !== false) {
      transformers.push(transformerTab());
    }

    const lazy = options.lazy ?? true;
    let preloadLangs: unknown[] | undefined = options.langs;
    if (!lazy) {
      preloadLangs ??= Object.keys(highlighter.getBundledLanguages());
    }

    await Promise.all([
      highlighter.loadTheme(...(getRequiredThemes(options) as never[])),
      preloadLangs && highlighter.loadLanguage(...(preloadLangs as never[])),
    ]);
    return rehypeShikiFromHighlighter(highlighter, {
      ...options,
      transformers,
    });
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
