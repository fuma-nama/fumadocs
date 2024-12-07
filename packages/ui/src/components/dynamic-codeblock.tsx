'use client';
import { CodeBlock, Pre } from '@/components/codeblock';
import type { HighlightOptions } from 'fumadocs-core/server';
import { useShiki } from 'fumadocs-core/utils/use-shiki';

const components = {
  pre(props) {
    return (
      <CodeBlock {...props}>
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
  });
}
