import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeShiki, { type RehypeShikiOptions } from '@shikijs/rehype';
import {
  type Components,
  type Jsx,
  toJsxRuntime,
} from 'hast-util-to-jsx-runtime';
import { type ReactNode } from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';

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
];

export interface Processor {
  process: (
    content: string,
    components: Partial<Components>,
  ) => Promise<ReactNode>;
}

export function createProcessor(): Processor {
  function filterMetaString(meta: string): string {
    let replaced = meta;
    for (const value of metaValues) {
      replaced = replaced.replace(value.regex, '');
    }

    return replaced;
  }

  const processor = remark()
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeKatex)
    .use(rehypeShiki, {
      defaultLanguage: 'text',
      defaultColor: false,
      themes: {
        light: 'vitesse-light',
        dark: 'vitesse-dark',
      },
      lazy: true,
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
      transformers: [
        {
          name: 'rehype-code:pre-process',
          preprocess(code, { meta }) {
            if (meta) {
              meta.__raw = filterMetaString(meta.__raw ?? '');
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
      ],
    } satisfies RehypeShikiOptions);

  return {
    async process(content, components) {
      const nodes = processor.parse({ value: content });
      const hast = await processor.run(nodes);
      return toJsxRuntime(hast, {
        development: false,
        jsx: jsx as Jsx,
        jsxs: jsxs as Jsx,
        Fragment,
        components,
      });
    },
  };
}
