import type { Root } from 'hast';
import type { RehypeShikiOptions } from '@shikijs/rehype';
import rehypeShikiFromHighlighter from '@shikijs/rehype/core';
import {
  transformerNotationDiff,
  transformerNotationFocus,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from '@shikijs/transformers';
import type { Processor, Transformer } from 'unified';
import type { Highlighter, ShikiTransformer } from 'shiki';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { CodeBlockIcon, IconOptions } from './transformer-icon';
import { transformerIcon } from './transformer-icon';
import { parseCodeBlockAttributes } from '@/mdx-plugins/codeblock-utils';
import type { DistributiveOmit } from '@/types';
import type { ResolvedShikiConfig } from '@/highlight/config';

export function rehypeCodeDefaultOptions(config: ResolvedShikiConfig): RehypeCodeOptionsCommon {
  return {
    lazy: true,
    ...config.defaultThemes,
    defaultColor: false,
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

      data.__parsed_raw = parsed.rest;
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

export type RehypeCodeOptionsCommon = DistributiveOmit<RehypeShikiOptions, 'lazy'> & {
  /**
   * Load languages and themes on-demand.
   * @defaultValue true
   */
  lazy?: boolean;

  /**
   * Filter meta string before processing
   */
  filterMetaString?: (metaString: string) => string;

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
  configFactory:
    | ResolvedShikiConfig
    | ((options?: Options) => {
        config: ResolvedShikiConfig;
        options: RehypeCodeOptionsCommon;
      }),
) {
  return function rehypeCode(
    this: Processor,
    _options: Options | undefined,
  ): Transformer<Root, Root> {
    const { config, options } =
      typeof configFactory === 'function'
        ? configFactory(_options)
        : {
            config: configFactory,
            options: {
              ...rehypeCodeDefaultOptions(configFactory),
              ..._options,
            },
          };

    const transformers = options.transformers ? [...options.transformers] : [];
    transformers.unshift({
      name: 'rehype-code:pre-process',
      preprocess(code, { meta }) {
        if (meta && '__parsed_raw' in meta) {
          meta.__raw = meta.__parsed_raw;
          delete meta.__parsed_raw;
        }

        if (meta && options.filterMetaString) {
          meta.__raw = options.filterMetaString(meta.__raw ?? '');
        }

        // Remove empty line at end
        return code.replace(/\n$/, '');
      },
    });

    if (options.icon !== false) {
      transformers.push(transformerIcon(options.icon));
    }

    if (options.tab !== false) {
      transformers.push(transformerTab());
    }

    const transformer = Promise.resolve(config.createHighlighter()).then(async (highlighter) => {
      if ('themes' in options) {
        await highlighter.loadTheme(...(Object.values(options.themes).filter(Boolean) as never[]));
      } else {
        await highlighter.loadTheme(options.theme as never);
      }

      const langs =
        options.langs ??
        (options.lazy
          ? ['js', 'jsx', 'ts', 'tsx']
          : Object.keys(highlighter.getBundledLanguages()));

      await highlighter.loadLanguage(...(langs as never[]));
      return rehypeShikiFromHighlighter(highlighter as Highlighter, {
        ...options,
        transformers,
      });
    });

    return async (tree, file) => {
      await (
        await transformer
      )(tree, file, () => {
        // nothing
      });
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
