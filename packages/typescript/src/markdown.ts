import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { toHast } from 'mdast-util-to-hast';
import { getSingletonHighlighter, type LanguageRegistration } from 'shiki';
import type { Nodes } from 'hast';
import { type Code, type RootContent } from 'mdast';

export async function renderMarkdownToHast(md: string): Promise<Nodes> {
  const mdast = fromMarkdown(
    md.replace(/{@link (?<link>[^}]*)}/g, '$1'), // replace jsdoc links
    { mdastExtensions: [gfmFromMarkdown()] },
  );

  const highlighter = await getSingletonHighlighter({
    themes: ['vitesse-light', 'vitesse-dark'],
  });

  async function preload(contents: RootContent[]): Promise<void> {
    await Promise.all(
      contents.map(async (c) => {
        if ('children' in c) await preload(c.children);

        if (c.type === 'code' && c.lang) {
          await highlighter.loadLanguage(
            c.lang as unknown as LanguageRegistration,
          );
        }
      }),
    );
  }

  await preload(mdast.children);

  return toHast(mdast, {
    handlers: {
      // @ts-expect-error hast with mdx
      code(_, node: Code) {
        const lang = node.lang ?? 'plaintext';

        return highlighter.codeToHast(node.value, {
          lang,
          themes: {
            light: 'vitesse-light',
            dark: 'vitesse-dark',
          },
          defaultColor: false,
          transformers: [
            {
              name: 'rehype-code:pre-process',
              line(hast) {
                if (hast.children.length > 0) return;
                // Keep the empty lines when using grid layout
                hast.children.push({
                  type: 'text',
                  value: ' ',
                });
              },
            },
          ],
        }).children;
      },
    },
  });
}
