'use client';
import { CodeBlock, Pre } from '@/components/codeblock';
import type { HighlightOptions } from 'fumadocs-core/server';
import { PrerenderScript, useShiki } from 'fumadocs-core/utils/use-shiki';
import { useId } from 'react';

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
  const scriptKey = useId();
  const shikiOptions = {
    lang,
    scriptKey,
    ...options,
    components: {
      ...components,
      ...options?.components,
    },
  };
  const children = useShiki(code, shikiOptions);

  return (
    <>
      <PrerenderScript
        scriptKey={scriptKey}
        code={code}
        options={shikiOptions}
      />
      {children}
    </>
  );
}
