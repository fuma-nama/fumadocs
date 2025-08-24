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
import {
  type BuiltinTheme,
  bundledLanguages,
  type ShikiTransformer,
} from 'shiki';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { CodeBlockIcon, IconOptions } from './transformer-icon';
import { transformerIcon } from './transformer-icon';
import { defaultThemes, getHighlighter } from '@/highlight/shiki';
import { parseCodeBlockAttributes } from '@/mdx-plugins/codeblock-utils';

export const rehypeCodeDefaultOptions: RehypeCodeOptions = {
  lazy: true,
  themes: defaultThemes,
  defaultColor: false,
  defaultLanguage: 'plaintext',
  experimentalJSEngine: false,
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
    const parsed = parseCodeBlockAttributes(meta);
    const data: Record<string, unknown> = parsed.attributes;
    parsed.rest = parseLineNumber(parsed.rest, data);

    data.__parsed_raw = parsed.rest;
    return data;
  },
};

function parseLineNumber(str: string, data: Record<string, unknown>) {
  return str.replace(/lineNumbers=(\d+)|lineNumbers/, (_, ...args) => {
    data['data-line-numbers'] = true;

    if (args[0] !== undefined)
      data['data-line-numbers-start'] = Number(args[0]);

    return '';
  });
}

export type RehypeCodeOptions = RehypeShikiOptions & {
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

  /**
   * Enable Shiki's experimental JS engine
   *
   * @defaultValue false
   */
  experimentalJSEngine?: boolean;
};

/**
 * Handle codeblocks
 */
export function rehypeCode(
  this: Processor,
  _options: Partial<RehypeCodeOptions> = {},
): Transformer<Root, Root> {
  const options: RehypeCodeOptions = {
    ...rehypeCodeDefaultOptions,
    ..._options,
  };

  const transformers = [...(options.transformers ?? [])];
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

  const highlighter = getHighlighter(
    options.experimentalJSEngine ? 'js' : 'oniguruma',
    {
      themes:
        'themes' in options
          ? (Object.values(options.themes).filter(Boolean) as BuiltinTheme[])
          : [options.theme],
      langs:
        options.langs ??
        (options.lazy ? ['ts', 'tsx'] : Object.keys(bundledLanguages)),
    },
  );

  const transformer = highlighter.then((loaded) =>
    rehypeShikiFromHighlighter(loaded, {
      ...options,
      transformers,
    }),
  );

  return async (tree, file) => {
    await (
      await transformer
    )(tree, file, () => {
      // nothing
    });
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
