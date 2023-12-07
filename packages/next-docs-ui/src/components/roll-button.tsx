'use client'

import { cn } from '@/utils/cn'
import { ChevronUpIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

type RollButtonProps = {
  /**
   * Percentage of scroll position to display the roll button
   *
   * @default 0.2
   */
  percentage?: number
}

/**
 * A button that scrolls to the top
 */
export function RollButton({ percentage = 0.2 }: RollButtonProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    window.addEventListener('scroll', () => {
      const element = document.scrollingElement
      if (!element) return
      const nearTop =
        element.scrollTop / (element.scrollHeight - element.clientHeight) <
        percentage

      setShow(!nearTop)
    })
  }, [])

  return (
    <button
      aria-label="Scroll to Top"
      className={cn(
        !show && 'translate-y-20 opacity-0',
        'rounded-full p-4 transition-all text-foreground bg-background border fixed bottom-12 right-12 z-50'
      )}
      onClick={() => {
        document.scrollingElement!.scrollTo({
          top: 0,
          behavior: 'smooth'
        })
      }}
    >
      <ChevronUpIcon className="w-5 h-5" />
    </button>
  )
}
