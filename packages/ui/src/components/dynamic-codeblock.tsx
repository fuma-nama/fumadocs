'use client';
import { CodeBlock, Pre } from '@/components/codeblock';
import type { HighlightOptions } from 'fumadocs-core/highlight';
import { useShiki } from 'fumadocs-core/highlight/client';
import { cn } from '@/utils/cn';

const components = {
  pre(props) {
    return (
      <CodeBlock {...props} className={cn('my-0', props.className)}>
        <Pre>{props.children}</Pre>
      </CodeBlock>
    );
  },
} satisfies HighlightOptions['components'];

export function DynamicCodeBlock({
  lang,
  code,
  options,
}: {
  lang: string;
  code: string;
  options?: Omit<HighlightOptions, 'lang'>;
}) {
  return useShiki(code, {
    lang,
    ...options,
    components: {
      ...components,
      ...options?.components,
    },
    withPrerenderScript: true,
  });
}
