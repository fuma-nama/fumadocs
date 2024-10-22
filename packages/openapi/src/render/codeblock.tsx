import { Fragment, type HTMLAttributes } from 'react';
import * as Base from 'fumadocs-ui/components/codeblock';
import { codeToHast } from 'shiki';
import { type Jsx, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { jsx, jsxs } from 'react/jsx-runtime';
import { sharedTransformers } from '@/utils/shiki';
import type { RenderContext } from '@/types';

export type CodeBlockProps = HTMLAttributes<HTMLPreElement> & {
  code: string;
  lang: string;
  options?: RenderContext['shikiOptions'];
};

export async function CodeBlock({
  code,
  lang,
  options,
  ...rest
}: CodeBlockProps): Promise<React.ReactElement> {
  const html = await codeToHast(code, {
    lang,
    defaultColor: false,
    themes: { light: 'github-light', dark: 'github-dark' },
    transformers: sharedTransformers,
    ...options,
  });

  const codeblock = toJsxRuntime(html, {
    development: false,
    jsx: jsx as Jsx,
    jsxs: jsxs as Jsx,
    Fragment,
    components: {
      pre: (props) => <Base.Pre {...props} {...rest} />,
    },
  });

  return <Base.CodeBlock className="my-0">{codeblock}</Base.CodeBlock>;
}
