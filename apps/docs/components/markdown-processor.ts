import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import { bundledLanguages, createHighlighter } from 'shiki/bundle/web';
import rehypeShikiFromHighlighter from '@shikijs/rehype/core';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

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

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- auto
export async function createProcessor() {
  const highlighter = await createHighlighter({
    themes: ['vitesse-light', 'vitesse-dark'],
    langs: Object.keys(bundledLanguages),
  });

  function filterMetaString(meta: string): string {
    let replaced = meta;
    for (const value of metaValues) {
      replaced = replaced.replace(value.regex, '');
    }

    return replaced;
  }

  return remark()
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeKatex)
    .use(() =>
      rehypeShikiFromHighlighter(highlighter, {
        defaultLanguage: 'text',
        defaultColor: false,
        themes: {
          light: 'vitesse-light',
          dark: 'vitesse-dark',
        },
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
      }),
    );
}
