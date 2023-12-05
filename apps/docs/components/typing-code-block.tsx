import { cn } from '@/utils/cn'
import { Pre } from 'next-docs-ui/mdx-server'
import { useMemo, type ComponentPropsWithoutRef } from 'react'
import { getHighlighter, type ThemedToken } from 'shikiji'
import { TypingCode } from './typing-code-block.client'

const highlighter = await getHighlighter({
  langs: ['bash', 'ts', 'tsx'],
  themes: ['github-dark']
})

export type CodeBlockProps = ComponentPropsWithoutRef<typeof Pre> & {
  code: string
  lang: string
}

export function CodeBlock({ code, lang, className, ...props }: CodeBlockProps) {
  const tokens = useMemo(
    () =>
      highlighter.codeToThemedTokens(code, {
        lang
      }),
    [code]
  )

  return (
    <Pre className={cn('bg-black', className)} {...props}>
      <code className="grid">
        {tokens.map((token, i) => (
          <span data-line key={i}>
            {token.map((s, j) => (
              <span key={j} style={{ color: s.color }}>
                {s.content}
              </span>
            ))}
          </span>
        ))}
      </code>
    </Pre>
  )
}

export function TypingCodeBlock({
  code,
  lang,
  className,
  ...props
}: CodeBlockProps) {
  const result = useMemo(
    () =>
      highlighter.codeToThemedTokens(code, { lang, includeExplanation: false }),
    [code]
  )

  return (
    <Pre className={cn('bg-black', className)} {...props}>
      <code className="grid">
        {result.map((tokens, i) => (
          <TypingCode
            delay={result
              .slice(0, i)
              .map(t => tokenLength(t) * 50)
              .reduce((a, b) => a + b + 50, 0)}
            key={i}
            tokens={tokens}
            time={50}
          />
        ))}
      </code>
    </Pre>
  )
}

function tokenLength(tokens: ThemedToken[]): number {
  return tokens.map(s => s.content.length).reduce((a, b) => a + b, 0)
}
