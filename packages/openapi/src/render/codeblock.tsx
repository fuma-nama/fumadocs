import { type HTMLAttributes } from 'react';
import * as Base from 'fumadocs-ui/components/codeblock';
import type { RenderContext } from '@/types';
import { highlight } from 'fumadocs-core/server';

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
  const rendered = await highlight(code, {
    lang,
    ...options,
    components: {
      pre: (props) => <Base.Pre {...props} {...rest} />,
    },
  });

  return <Base.CodeBlock className="my-0">{rendered}</Base.CodeBlock>;
}
