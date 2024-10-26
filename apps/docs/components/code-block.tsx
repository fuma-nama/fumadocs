import * as Base from 'fumadocs-ui/components/codeblock';
import { Fragment } from 'react';
import { codeToHast } from 'shiki';
import { toJsxRuntime, type Jsx } from 'hast-util-to-jsx-runtime';
import { jsx, jsxs } from 'react/jsx-runtime';

export interface CodeBlockProps {
  code: string;
  wrapper?: Base.CodeBlockProps;
  lang: 'bash' | 'ts' | 'tsx';
}

export async function CodeBlock({
  code,
  lang,
  wrapper,
}: CodeBlockProps): Promise<React.ReactElement> {
  const hast = await codeToHast(code, {
    lang,
    defaultColor: false,
    themes: {
      light: 'github-light',
      dark: 'vesper',
    },
    transformers: [
      {
        name: 'rehype-code:pre-process',
        line(node) {
          if (node.children.length === 0) {
            // Keep the empty lines when using grid layout
            node.children.push({
              type: 'text',
              value: ' ',
            });
          }
        },
      },
    ],
  });

  const rendered = toJsxRuntime(hast, {
    jsx: jsx as Jsx,
    jsxs: jsxs as Jsx,
    Fragment,
    development: false,
    components: {
      // @ts-expect-error -- JSX component
      pre: Base.Pre,
    },
  });

  return <Base.CodeBlock {...wrapper}>{rendered}</Base.CodeBlock>;
}
