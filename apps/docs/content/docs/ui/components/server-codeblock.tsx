import * as Base from 'fumadocs-ui/components/codeblock';
import { highlight } from 'fumadocs-core/highlight/core';
import { type HTMLAttributes } from 'react';
import { shikiConfig } from '@/lib/shiki';

export async function CodeBlock({
  code,
  lang,
  ...rest
}: HTMLAttributes<HTMLElement> & {
  code: string;
  lang: string;
}) {
  const rendered = await highlight(code, {
    lang,
    components: {
      pre: (props) => <Base.Pre {...props} />,
    },
    config: shikiConfig,
    // other Shiki options
  });

  return <Base.CodeBlock {...rest}>{rendered}</Base.CodeBlock>;
}
