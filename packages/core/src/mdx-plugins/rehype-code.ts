import type { Root } from 'hast';
import type { RehypeShikiOptions } from '@shikijs/rehype';
import rehypeShikiFromHighlighter from '@shikijs/rehype/core';
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from 'shiki-transformers';
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
import { createStyleTransformer, defaultThemes } from '@/server/shiki';

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
];

export const rehypeCodeDefaultOptions: RehypeCodeOptions = {
  themes: defaultThemes,
  defaultColor: false,
  defaultLanguage: 'plaintext',
  experimentalJSEngine: false,
  transformers: [
    createStyleTransformer(),
    transformerNotationHighlight(),
    transformerNotationWordHighlight(),
    transformerNotationDiff(),
  ],
  parseMetaString(meta) {
    const map: Record<string, string> = {};

    for (const value of metaValues) {
      const result = value.regex.exec(meta);

      if (result) {
        map[value.name] = result[1];
      }
    }

    return map;
  },
  filterMetaString(meta) {
    let replaced = meta;
    for (const value of metaValues) {
      replaced = replaced.replace(value.regex, '');
    }

    return replaced;
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
  options: Partial<RehypeCodeOptions> = {},
): Transformer<Root, Root> {
  const codeOptions: RehypeCodeOptions = {
    ...rehypeCodeDefaultOptions,
    ...options,
  };

  codeOptions.transformers ||= [];
  codeOptions.transformers = [
    {
      name: 'rehype-code:pre-process',
      preprocess(code, { meta }) {
        if (meta && codeOptions.filterMetaString) {
          meta.__raw = codeOptions.filterMetaString(meta.__raw ?? '');
        }

        // Remove empty line at end
        return code.replace(/\n$/, '');
      },
    },
    ...codeOptions.transformers,
  ];

  if (codeOptions.icon !== false) {
    codeOptions.transformers = [
      ...codeOptions.transformers,
      transformerIcon(codeOptions.icon),
    ];
  }

  if (codeOptions.tab !== false) {
    codeOptions.transformers = [...codeOptions.transformers, transformerTab()];
  }

  let themeItems: unknown[] = [];

  if ('themes' in codeOptions) {
    themeItems = Object.values(codeOptions.themes);
  } else if ('theme' in codeOptions) {
    themeItems = [codeOptions.theme];
  }

  const highlighter = getSingletonHighlighter({
    engine: codeOptions.experimentalJSEngine
      ? createJavaScriptRegexEngine()
      : createOnigurumaEngine(() => import('shiki/wasm')),
    themes: themeItems.filter(Boolean) as BuiltinTheme[],
    langs: codeOptions.langs ?? Object.keys(bundledLanguages),
  });

  const transformer = highlighter.then((instance) =>
    rehypeShikiFromHighlighter(instance, codeOptions),
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
      const meta = this.options.meta;
      if (typeof meta?.tab !== 'string') return root;

      return {
        type: 'root',
        children: [
          {
            type: 'mdxJsxFlowElement',
            name: 'Tab',
            data: {
              _codeblock: true,
            },
            attributes: [
              { type: 'mdxJsxAttribute', name: 'value', value: meta.tab },
            ],
            children: root.children,
          } as MdxJsxFlowElement,
        ],
      };
    },
  };
}

export { type CodeBlockIcon, transformerIcon, transformerTab };
