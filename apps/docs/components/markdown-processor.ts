import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeShikiFromHighlighter from '@shikijs/rehype/core';
import {
  createHighlighter,
  bundledLanguages,
  createJavaScriptRegexEngine,
} from 'shiki/bundle/web';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- auto
export async function createProcessor() {
  const highlighter = await createHighlighter({
    themes: ['vitesse-light', 'vitesse-dark'],
    langs: Object.keys(bundledLanguages),
    engine: createJavaScriptRegexEngine(),
  });

  return remark()
    .use(remarkGfm)
    .use(remarkRehype)
    .use(() =>
      rehypeShikiFromHighlighter(highlighter, {
        defaultLanguage: 'text',
        defaultColor: false,
        themes: {
          light: 'vitesse-light',
          dark: 'vitesse-dark',
        },
        transformers: [
          {
            name: 'rehype-code:pre-process',
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
