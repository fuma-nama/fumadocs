import { type HTMLAttributes } from 'react';
import * as Base from 'fumadocs-ui/components/codeblock';
import { codeToHast } from 'shiki';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { jsx, jsxs } from 'react/jsx-runtime';
import { sharedTransformers } from '@/utils/shiki';

export type CodeBlockProps = HTMLAttributes<HTMLPreElement> & {
  code: string;
  lang: string;
};

export async function CodeBlock({
  code,
  lang,
  ...props
}: CodeBlockProps): Promise<React.ReactElement> {
  const html = await codeToHast(code, {
    lang,
    defaultColor: false,
    themes: { light: 'github-light', dark: 'github-dark' },
    transformers: sharedTransformers,
  });

  const codeblock = toJsxRuntime(html, {
    development: false,
    // @ts-expect-error -- untyped
    jsx,
    // @ts-expect-error -- untyped
    jsxs,
    components: {
      // @ts-expect-error -- untyped
      pre: Base.Pre,
    },
  });

  return <Base.CodeBlock className="my-0">{codeblock}</Base.CodeBlock>;
}
