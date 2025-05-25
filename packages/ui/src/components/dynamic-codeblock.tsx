'use client';
import { CodeBlock, Pre } from '@/components/codeblock';
import type {
  HighlightOptionsCommon,
  HighlightOptionsThemes,
} from 'fumadocs-core/highlight';
import { useShiki } from 'fumadocs-core/highlight/client';
import { cn } from '@/utils/cn';
import { type ComponentProps, useMemo } from 'react';

function pre(props: ComponentProps<'pre'>) {
  return (
    <CodeBlock {...props} className={cn('my-0', props.className)}>
      <Pre>{props.children}</Pre>
    </CodeBlock>
  );
}

export function DynamicCodeBlock({
  lang,
  code,
  options,
}: {
  lang: string;
  code: string;
  options?: Omit<HighlightOptionsCommon, 'lang'> & HighlightOptionsThemes;
}) {
  const components: HighlightOptionsCommon['components'] = {
    pre,
    ...options?.components,
  };
  const loading = useMemo(() => {
    const Pre = (components.pre ?? 'pre') as 'pre';
    const Code = (components.code ?? 'code') as 'code';

    return (
      <Pre>
        <Code>
          {code.split('\n').map((line, i) => (
            <span key={i} className="line">
              {line}
            </span>
          ))}
        </Code>
      </Pre>
    );
    // eslint-disable-next-line -- initial value only
  }, []);

  return useShiki(code, {
    lang,
    loading,
    withPrerenderScript: true,
    ...options,
    components,
  });
}
