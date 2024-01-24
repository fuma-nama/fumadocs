import * as Base from 'fumadocs-ui/components/codeblock';
import type { HTMLAttributes } from 'react';
import { useMemo } from 'react';
import { getHighlighter } from 'shikiji';

const highlighter = await getHighlighter({
  langs: ['bash', 'ts', 'tsx'],
  themes: ['github-light', 'github-dark'],
});

export type CodeBlockProps = HTMLAttributes<HTMLPreElement> & {
  code: string;
  wrapper?: Base.CodeBlockProps;
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
    <Base.CodeBlock {...wrapper}>
      <Base.Pre {...props}>
        <code>
          {tokens.map((token, i) => (
            // eslint-disable-next-line react/no-array-index-key -- Should not re-render
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
      </Base.Pre>
    </Base.CodeBlock>
  );
}
