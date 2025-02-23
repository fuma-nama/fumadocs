import type { Root } from 'hast';
import type { RehypeShikiOptions } from '@shikijs/rehype';
import rehypeShikiFromHighlighter from '@shikijs/rehype/core';
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from '@shikijs/transformers';
import type { Processor, Transformer } from 'unified';
import {
  getSingletonHighlighter,
  type ShikiTransformer,
  type BuiltinTheme,
  bundledLanguages,
} from 'shiki';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import type { IconOptions, CodeBlockIcon } from './transformer-icon';
import { transformerIcon } from './transformer-icon';
import { createStyleTransformer, defaultThemes } from '@/highlight/shiki';

interface MetaValue {
  name: string;
  regex: RegExp;
}

/**
 * Custom meta string values
 */
const metaValues: MetaValue[] = [
  {
    name: 'title',
    regex: /title="(?<value>[^"]*)"/,
  },
  {
    name: 'custom',
    regex: /custom="(?<value>[^"]+)"/,
  },
  {
    name: 'tab',
    regex: /tab="(?<value>[^"]+)"/,
  },
  {
    name: 'tab',
    regex: /tab/,
  },
];

export const rehypeCodeDefaultOptions: RehypeCodeOptions = {
  themes: defaultThemes,
  defaultColor: false,
  defaultLanguage: 'plaintext',
  experimentalJSEngine: false,
  transformers: [
    createStyleTransformer(),
    transformerNotationHighlight({
      matchAlgorithm: 'v3',
    }),
    transformerNotationWordHighlight({
      matchAlgorithm: 'v3',
    }),
    transformerNotationDiff({
      matchAlgorithm: 'v3',
    }),
  ],
  parseMetaString(meta) {
    const map: Record<string, string> = {};

    for (const value of metaValues) {
      meta = meta.replace(value.regex, (_, ...args) => {
        const first = args.at(0);
        map[value.name] = typeof first === 'string' ? first : '';

        return '';
      });
    }

    map.__parsed_raw = meta;
    return map;
  },
};

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
  tab?: false;

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

  const highlighter = getSingletonHighlighter({
    engine: options.experimentalJSEngine
      ? createJavaScriptRegexEngine()
      : createOnigurumaEngine(() => import('shiki/wasm')),
    themes:
      'themes' in options
        ? (Object.values(options.themes).filter(Boolean) as BuiltinTheme[])
        : [options.theme],
    langs:
      options.langs ??
      (options.lazy ? undefined : Object.keys(bundledLanguages)),
  });

  const transformer = highlighter.then((instance) =>
    rehypeShikiFromHighlighter(instance, {
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

      return {
        type: 'root',
        children: [
          {
            type: 'mdxJsxFlowElement',
            name: 'Tab',
            data: {
              _codeblock: true,
            },
            attributes:
              value !== ''
                ? [{ type: 'mdxJsxAttribute', name: 'value', value }]
                : [],
            children: root.children,
          } as MdxJsxFlowElement,
        ],
      };
    },
  };
}

export { type CodeBlockIcon, transformerIcon, transformerTab };
