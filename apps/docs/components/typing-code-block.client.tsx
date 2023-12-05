'use client'

import { useEffect, useState } from 'react'
import type { ThemedToken } from 'shikiji'

export function TypingCode({
  tokens,
  delay,
  time
}: {
  tokens: ThemedToken[]
  /**
   * Delay to start animation (in ms)
   */
  delay: number
  /**
   * Time (in ms) to type a char
   */
  time: number
}) {
  const [length, setLength] = useState(0)

  useEffect(() => {
    const start = new Date(Date.now())
    start.setMilliseconds(start.getMilliseconds() + delay)

    const maxLen = tokens.map(t => t.content.length).reduce((a, b) => a + b, 0)
    const timer = setInterval(() => {
      if (Date.now() >= start.getTime()) setLength(l => Math.min(maxLen, l + 1))
    }, time)

    return () => {
      clearInterval(timer)
    }
  }, [tokens])

  let currentLen = 0
  return (
    <span data-line>
      {tokens.flatMap((s, j) => {
        if (currentLen > length) return
        const slicedContent = s.content.slice(
          0,
          Math.max(0, length - currentLen)
        )
        currentLen += s.content.length

        return (
          <span key={j} style={{ color: s.color }}>
            {slicedContent}
          </span>
        )
      })}
    </span>
  )
}
