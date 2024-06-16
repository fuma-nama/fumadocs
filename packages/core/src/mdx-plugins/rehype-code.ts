import type { Root, RootContent } from 'hast';
import rehypeShiki, { type RehypeShikiOptions } from '@shikijs/rehype';
import {
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from '@shikijs/transformers';
import type { Processor, Transformer } from 'unified';
import type { ShikiTransformer } from 'shiki';
import type { IconOptions, CodeBlockIcon } from './transformer-icon';
import { transformerIcon } from './transformer-icon';

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
  themes: {
    light: 'github-light',
    dark: 'github-dark',
  },
  defaultLanguage: 'plaintext',
  defaultColor: false,
  transformers: [
    transformerNotationHighlight(),
    transformerNotationWordHighlight(),
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
   * Default language
   *
   * @defaultValue plaintext
   * @deprecated Use `defaultLanguage` instead
   */
  defaultLang?: string;

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
      line(hast) {
        if (hast.children.length === 0) {
          // Keep the empty lines when using grid layout
          hast.children.push({
            type: 'text',
            value: ' ',
          });
        }
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

  if (codeOptions.defaultLang) {
    codeOptions.defaultLanguage = codeOptions.defaultLang;
  }

  return rehypeShiki.call(this, codeOptions) as Transformer<Root, Root>;
}

function transformerTab(): ShikiTransformer {
  return {
    name: 'rehype-code:tab',
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
          } as RootContent,
        ],
      } as ReturnType<NonNullable<ShikiTransformer['root']>>;
    },
  };
}

export { type CodeBlockIcon, transformerIcon };
