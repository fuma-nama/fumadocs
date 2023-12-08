import { Pre } from 'next-docs-ui/mdx-server'
import { useMemo, type ComponentPropsWithoutRef } from 'react'
import { getHighlighter } from 'shikiji'

const highlighter = await getHighlighter({
  langs: ['bash', 'ts', 'tsx'],
  themes: ['github-light', 'github-dark']
})

export type CodeBlockProps = ComponentPropsWithoutRef<typeof Pre> & {
  code: string
  lang: string
}

export function CodeBlock({ code, lang, ...props }: CodeBlockProps) {
  const tokens = useMemo(
    () =>
      highlighter.codeToTokensWithThemes(code, {
        lang,
        themes: {
          light: 'github-light',
          dark: 'github-dark'
        }
      }),
    [code]
  )

  return (
    <Pre {...props}>
      <code className="grid">
        {tokens.map((token, i) => (
          <span data-line key={i}>
            {token.map((s, j) => (
              <span
                key={j}
                style={Object.fromEntries(
                  Object.entries(s.variants).map(([k, v]) => [
                    `--shiki-${k}`,
                    v.color
                  ])
                )}
              >
                {s.content}
              </span>
            ))}
          </span>
        ))}
      </code>
    </Pre>
  )
}
