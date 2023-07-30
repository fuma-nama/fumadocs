import clsx from 'clsx'
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
      className={clsx(
        !show && 'nd-translate-y-20 nd-opacity-0',
        'nd-rounded-full nd-p-4 nd-transition-all nd-text-foreground nd-bg-background nd-border nd-fixed nd-bottom-12 nd-right-12 nd-z-50 2xl:nd-right-[20vw]'
      )}
      onClick={() => {
        document.scrollingElement!.scrollTo({
          top: 0,
          behavior: 'smooth'
        })
      }}
    >
      <ChevronUpIcon className="nd-w-5 nd-h-5" />
    </button>
  )
}
