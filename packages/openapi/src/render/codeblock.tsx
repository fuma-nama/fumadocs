import { type HTMLAttributes, useMemo } from 'react';
import * as Base from 'fumadocs-ui/components/codeblock';
import { createHighlighter, bundledLanguages, bundledThemes } from 'shiki';

export type CodeBlockProps = HTMLAttributes<HTMLPreElement> & {
  code: string;
  lang: string;
};

const highlighter = await createHighlighter({
  themes: Object.values(bundledThemes),
  langs: Object.values(bundledLanguages),
});

export function CodeBlock({
  code,
  lang,
  ...props
}: CodeBlockProps): React.ReactElement {
  const html = useMemo(() => {
    return highlighter.codeToHtml(code, {
      lang,
      defaultColor: false,
      themes: { light: 'github-light', dark: 'github-dark' },
    });
  }, [code, lang]);

  return (
    <Base.CodeBlock className="my-0">
      <Base.Pre {...props} dangerouslySetInnerHTML={{ __html: html }} />
    </Base.CodeBlock>
  );
}
