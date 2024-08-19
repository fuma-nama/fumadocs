import { type HTMLAttributes, useLayoutEffect, useState } from 'react';
import * as Base from 'fumadocs-ui/components/codeblock';
import { useApiContext } from '@/ui/contexts/api';
import { sharedTransformers } from '@/utils/shiki';

export type CodeBlockProps = HTMLAttributes<HTMLPreElement> & {
  code: string;
  lang?: string;
};

export function CodeBlock({
  code,
  lang = 'json',
  ...props
}: CodeBlockProps): React.ReactElement {
  const { highlighter } = useApiContext();
  const [html, setHtml] = useState('');

  useLayoutEffect(() => {
    if (!highlighter) return;

    const themedHtml = highlighter.codeToHtml(code, {
      lang,
      defaultColor: false,
      themes: { light: 'github-light', dark: 'github-dark' },
      transformers: sharedTransformers,
    });

    setHtml(themedHtml);
  }, [code, lang, highlighter]);

  return (
    <Base.CodeBlock className="my-0">
      <Base.Pre {...props} dangerouslySetInnerHTML={{ __html: html }} />
    </Base.CodeBlock>
  );
}
