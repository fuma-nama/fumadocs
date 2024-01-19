import { Pre } from 'fumadocs-ui/mdx/pre';
import { useMemo, type ComponentPropsWithoutRef } from 'react';
import { getHighlighter } from 'shikiji';

const highlighter = await getHighlighter({
  langs: ['bash', 'ts', 'tsx'],
  themes: ['github-light', 'github-dark'],
});

export type CodeBlockProps = ComponentPropsWithoutRef<typeof Pre> & {
  code: string;
  lang: 'bash' | 'ts' | 'tsx';
};

export function CodeBlock({
  code,
  lang,
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
    <Pre {...props}>
      <code className="grid">
        {tokens.map((token, i) => (
          // eslint-disable-next-line react/no-array-index-key -- Should not re-render
          <span data-line key={i}>
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
    </Pre>
  );
}
