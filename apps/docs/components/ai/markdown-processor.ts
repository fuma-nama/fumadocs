import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeShikiFromHighlighter from '@shikijs/rehype/core';
import { type Components, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { type ReactNode } from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import { createHighlighter } from 'shiki';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { createStyleTransformer } from 'fumadocs-core/server';
import type { Root } from 'hast';

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

  const themes = {
    light: 'vitesse-light',
    dark: 'vitesse-dark',
  };

  const rehypeShiki = createHighlighter({
    langs: [],
    themes: Object.values(themes),
    engine: createJavaScriptRegexEngine(),
  }).then((highlighter) => {
    return rehypeShikiFromHighlighter(highlighter, {
      defaultLanguage: 'text',
      defaultColor: false,
      themes,
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
          name: 'pre-process',
          preprocess(_, { meta }) {
            if (meta) {
              meta.__raw = filterMetaString(meta.__raw ?? '');
            }
          },
        },
        createStyleTransformer(),
      ],
    });
  });

  const processor = remark()
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeKatex)
    .use(() => {
      return async (tree: Root, file) => {
        const transformer = await rehypeShiki;

        return transformer(tree, file, () => {
          // do nothing
        }) as Root;
      };
    });

  return {
    async process(content, components) {
      const nodes = processor.parse({ value: content });
      const hast = await processor.run(nodes);
      return toJsxRuntime(hast, {
        development: false,
        jsx,
        jsxs,
        Fragment,
        components,
      });
    },
  };
}
