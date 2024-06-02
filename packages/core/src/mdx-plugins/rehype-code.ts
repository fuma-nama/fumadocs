import type { Root } from 'hast';
import rehypeShiki, { type RehypeShikiOptions } from '@shikijs/rehype';
import {
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from '@shikijs/transformers';
import type { Processor, Transformer } from 'unified';
import { visit } from './hast-utils';
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
];

export const rehypeCodeDefaultOptions: RehypeCodeOptions = {
  themes: {
    light: 'github-light',
    dark: 'github-dark',
  },
  defaultLang: 'plaintext',
  defaultColor: false,
  transformers: [
    transformerNotationHighlight(),
    transformerNotationWordHighlight(),
  ],
  parseMetaString(meta) {
    const map: Record<string, string> = {};

    for (const value of metaValues) {
      const result = value.regex.exec(meta);

      if (result?.groups) {
        map[value.name] = result.groups.value;
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
   */
  defaultLang?: string;

  /**
   * Add icon to code blocks
   */
  icon?: IconOptions | false;
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
      name: 'rehype-code:filter-meta',
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

  const prefix = 'language-';
  const transformer = rehypeShiki.call(this, codeOptions);

  return async (root, file) => {
    visit(root, ['pre'], (element) => {
      const head = element.children[0];

      if (
        element.children.length === 0 ||
        head.type !== 'element' ||
        head.tagName !== 'code'
      )
        return;

      head.properties.className ||= [];
      const classes = head.properties.className;

      if (!Array.isArray(classes)) return;

      const hasLanguage = classes.some(
        (d) => typeof d === 'string' && d.startsWith(prefix),
      );

      if (!hasLanguage && codeOptions.defaultLang)
        classes.push(`${prefix}${codeOptions.defaultLang}`);
    });

    if (transformer)
      await transformer.call(this, root, file, () => {
        // nothing
      });
  };
}

export { type CodeBlockIcon, transformerIcon };
