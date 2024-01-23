import * as Pre from 'fumadocs-ui/mdx/pre';
import type { HTMLAttributes } from 'react';
import { useMemo } from 'react';
import { getHighlighter } from 'shikiji';

const highlighter = await getHighlighter({
  langs: ['bash', 'ts', 'tsx'],
  themes: ['github-light', 'github-dark'],
});

export type CodeBlockProps = HTMLAttributes<HTMLPreElement> & {
  code: string;
  wrapper?: Pre.CodeBlockProps;
  lang: 'bash' | 'ts' | 'tsx';
};

export function CodeBlock({
  code,
  lang,
  wrapper,
  ...props
}: CodeBlockProps): JSX.Element {
  const tokens = useMemo(
    () =>
      highlighter.codeToTokensWithThemes(code, {
        lang,
        themes: {
          light: 'github-light',
          dark: 'github-dark',
        },
      }),
    [code, lang],
  );

  return (
    <Pre.CodeBlock {...wrapper}>
      <Pre.Pre {...props}>
        <code>
          {tokens.map((token, i) => (
            // eslint-disable-next-line react/no-array-index-key, tailwindcss/no-custom-classname -- Should not re-render
            <span className="line" key={i}>
              {token.map((s, j) => (
                <span
                  // eslint-disable-next-line react/no-array-index-key -- Should not re-render
                  key={j}
                  style={Object.fromEntries(
                    Object.entries(s.variants).map(([k, v]) => [
                      `--shiki-${k}`,
                      v.color,
                    ]),
                  )}
                >
                  {s.content}
                </span>
              ))}
            </span>
          ))}
        </code>
      </Pre.Pre>
    </Pre.CodeBlock>
  );
}
