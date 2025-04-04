'use client';
import { CodeBlock, Pre } from '@/components/codeblock';
import type {
  HighlightOptionsCommon,
  HighlightOptionsThemes,
} from 'fumadocs-core/highlight';
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
} satisfies HighlightOptionsCommon['components'];

export function DynamicCodeBlock({
  lang,
  code,
  options,
}: {
  lang: string;
  code: string;
  options?: Omit<HighlightOptionsCommon, 'lang'> & HighlightOptionsThemes;
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
