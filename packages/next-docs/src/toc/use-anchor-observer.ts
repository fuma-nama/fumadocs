import { useEffect, useState } from 'react'

export type ActiveAnchor = Record<
  string,
  {
    isActive?: boolean
    aboveHalfViewport: boolean
    index: number
    insideHalfViewport: boolean
  }
>

/**
 *
 * @param watch An array of element ids to watch
 * @returns Anchors info
 */
export function useAnchorObserver(watch: string[]) {
  const [activeAnchor, setActiveAnchor] = useState<ActiveAnchor>({})

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        setActiveAnchor(f => {
          const ret = { ...f }

          for (const entry of entries) {
            const headingIdx = watch.findIndex(
              heading => heading === entry.target.id
            )

            if (entry?.rootBounds && headingIdx !== -1) {
              const aboveHalfViewport =
                entry.boundingClientRect.y + entry.boundingClientRect.height <=
                entry.rootBounds.y + entry.rootBounds.height
              const insideHalfViewport = entry.intersectionRatio > 0
              ret[entry.target.id] = {
                index: headingIdx,
                aboveHalfViewport,
                insideHalfViewport
              }
            }
          }

          let activeSlug = ''
          let smallestIndexInViewport = Infinity
          let largestIndexAboveViewport = -1
          for (const s in ret) {
            ret[s].isActive = false
            if (
              ret[s].insideHalfViewport &&
              ret[s].index < smallestIndexInViewport
            ) {
              smallestIndexInViewport = ret[s].index
              activeSlug = s
            }
            if (
              smallestIndexInViewport === Infinity &&
              ret[s].aboveHalfViewport &&
              ret[s].index > largestIndexAboveViewport
            ) {
              largestIndexAboveViewport = ret[s].index
              activeSlug = s
            }
          }

          if (ret[activeSlug]) ret[activeSlug].isActive = true
          return ret
        })
      },
      {
        rootMargin: '0px 0px -50%',
        threshold: [0, 1]
      }
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
