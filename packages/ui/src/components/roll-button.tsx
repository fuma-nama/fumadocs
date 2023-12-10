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
        'text-foreground bg-background fixed bottom-12 right-12 z-50 rounded-full border p-4 transition-all'
      )}
      onClick={() => {
        document.scrollingElement!.scrollTo({
          top: 0,
          behavior: 'smooth'
        })
      }}
    >
      <ChevronUpIcon className="h-5 w-5" />
    </button>
  )
}
