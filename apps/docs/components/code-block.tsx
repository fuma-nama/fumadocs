import * as Base from 'fumadocs-ui/components/codeblock';
import type { HTMLAttributes } from 'react';
import { codeToHtml } from 'shiki';

export type CodeBlockProps = HTMLAttributes<HTMLPreElement> & {
  code: string;
  wrapper?: Base.CodeBlockProps;
  lang: 'bash' | 'ts' | 'tsx';
};

export async function CodeBlock({
  code,
  lang,
  wrapper,
  ...props
}: CodeBlockProps): Promise<React.ReactElement> {
  const html = await codeToHtml(code, {
    lang,
    defaultColor: false,
    themes: {
      light: 'github-light',
      dark: 'github-dark',
    },
    transformers: [
      {
        name: 'remove-pre',
        root: (root) => {
          if (root.children[0].type !== 'element') return;

          return {
            type: 'root',
            children: root.children[0].children,
          };
        },
      },
    ],
  });

  return (
    <Base.CodeBlock {...wrapper}>
      <Base.Pre {...props} dangerouslySetInnerHTML={{ __html: html }} />
    </Base.CodeBlock>
  );
}
