import * as Base from 'fumadocs-ui/components/codeblock';
import { getHighlighter, hastToJsx } from 'fumadocs-core/highlight';
import { cn } from '@/lib/cn';
import type { BundledLanguage } from 'shiki';

export interface CodeBlockProps {
  code: string;
  wrapper?: Base.CodeBlockProps;
  lang: string;
}

const highlighter = await getHighlighter('js', {
  langs: ['js', 'ts', 'jsx', 'tsx'],
  themes: ['vesper', 'github-light'],
});

export async function CodeBlock({ code, lang, wrapper }: CodeBlockProps) {
  await highlighter.loadLanguage(lang as BundledLanguage);
  const hast = highlighter.codeToHast(code, {
    lang,
    defaultColor: false,
    themes: {
      light: 'github-light',
      dark: 'vesper',
    },
  });

  const rendered = hastToJsx(hast, {
    components: {
      pre: Base.Pre,
    },
  });

  return (
    <Base.CodeBlock {...wrapper} className={cn('my-0', wrapper?.className)}>
      {rendered}
    </Base.CodeBlock>
  );
}
