import { useEffect, useState } from 'react'

/**
 *
 * @param watch An array of element ids to watch
 * @returns Active anchor
 */
export function useAnchorObserver(watch: string[]): string | undefined {
  const [activeAnchor, setActiveAnchor] = useState<string>()

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        setActiveAnchor(f => {
          for (const entry of entries) {
            // If above half the viewport
            const aboveHalf =
              window.innerHeight / 2 > entry.boundingClientRect.y
            const active = aboveHalf && entry.isIntersecting

            if (active) {
              return entry.target.id
            }
          }

          // use the first item if not found
          return f ?? watch[0]
        })
      },
      { rootMargin: `0% 0% -80% 0%` }
    )

    for (const heading of watch) {
      const element = document.getElementById(heading)

      if (element != null) {
        observer.observe(element)
      }
    }

    return () => {
      observer.disconnect()
    }
  }, [watch])

  return activeAnchor
}
