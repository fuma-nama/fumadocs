import { use, type HTMLAttributes } from 'react';
import { cache } from '#rsc-apis';
import * as Base from 'fumadocs-ui/components/codeblock';
import type { RenderContext } from '@/types';
import { highlight } from 'fumadocs-core/highlight';
import { cn } from 'fumadocs-ui/utils/cn';
import { ClientSuspense } from '#rsc-apis';

export interface CodeBlockProps extends HTMLAttributes<HTMLElement> {
  code: string;
  lang: string;
  ctx: RenderContext;
}

const highlightCached = cache(
  (code: string, lang: string, shikiOptions: RenderContext['shikiOptions']) =>
    highlight(code, {
      lang,
      ...shikiOptions,
      components: {
        pre: (props) => <Base.Pre {...props} />,
      },
    }),
);

export function CodeBlockInner({ code, lang, ctx, ...rest }: CodeBlockProps) {
  const rendered = use(highlightCached(code, lang, ctx.shikiOptions));

  return (
    <Base.CodeBlock className={cn('my-0', rest.className)}>
      {rendered}
    </Base.CodeBlock>
  );
}

export function CodeBlock(props: CodeBlockProps) {
  return (
    <ClientSuspense
      fallback={<Base.CodeBlock className={cn('my-0', props.className)} />}
    >
      <CodeBlockInner {...props} />
    </ClientSuspense>
  );
}
