import type { Root } from 'hast';
import rehypeShikiji, { type RehypeShikijiOptions } from 'rehype-shikiji';
import {
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from 'shikiji-transformers';
import type { Processor, Transformer } from 'unified';

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

const defaultCodeOptions: RehypeCodeOptions = {
  themes: {
    light: 'github-light',
    dark: 'github-dark',
  },
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

export type RehypeCodeOptions = RehypeShikijiOptions & {
  /**
   * Filter meta string before processing
   */
  filterMetaString?: (metaString: string) => string;
};

/**
 * Handle codeblocks
 */
export function rehypeCode(
  this: Processor,
  codeOptions?: RehypeCodeOptions,
): Transformer<Root, Root> {
  const options: RehypeCodeOptions = {
    ...defaultCodeOptions,
    ...codeOptions,
  };

  options.transformers ||= [];
  options.transformers.unshift({
    name: 'next-docs:filter-meta',
    preprocess(code, { meta }) {
      if (meta && options.filterMetaString) {
        meta.__raw = options.filterMetaString(meta.__raw ?? '');
      }

      // Remove empty line at end
      return code.replace(/\n$/, '');
    },
  });

  const plugin = rehypeShikiji.call(this, options);

  if (!plugin) throw new Error();

  return plugin;
}
