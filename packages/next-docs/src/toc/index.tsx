import { mergeRefs } from '@/merge-refs'
import type { TableOfContents, TOCItemType } from '@/server/get-toc'
import type { ComponentPropsWithoutRef, HTMLAttributes, RefObject } from 'react'
import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useRef
} from 'react'
import scrollIntoView from 'scroll-into-view-if-needed'
import { useAnchorObserver } from './use-anchor-observer'

const ActiveAnchorContext = createContext<{
  activeAnchor: string | undefined
  containerRef: RefObject<HTMLElement>
} | null>(null)

export const useActiveAnchor = (url: string): boolean => {
  const { activeAnchor } = useContext(ActiveAnchorContext)!

  return activeAnchor === url.split('#')[1]
}

type TOCProviderProps = HTMLAttributes<HTMLDivElement> & {
  toc: TableOfContents
}

export const TOCProvider = forwardRef<HTMLDivElement, TOCProviderProps>(
  ({ toc, ...props }, ref) => {
    const headings = useMemo(() => {
      return toc
        .flatMap(item => getHeadings(item))
        .map(item => item.split('#')[1])
    }, [toc])

    const containerRef = useRef<HTMLDivElement>(null)
    const mergedRef = mergeRefs(containerRef, ref)

    const activeAnchor = useAnchorObserver(headings)

    return (
      <div ref={mergedRef} {...props}>
        <ActiveAnchorContext.Provider value={{ containerRef, activeAnchor }}>
          {props.children}
        </ActiveAnchorContext.Provider>
      </div>
    )
  }
)

TOCProvider.displayName = 'TOCProvider'

function getHeadings(item: TOCItemType): string[] {
  const children = item.items?.flatMap(item => getHeadings(item)) ?? []

  return [item.url, ...children]
}

export type TOCItemProps = ComponentPropsWithoutRef<'a'> & {
  item: TOCItemType
}

export const TOCItem = forwardRef<HTMLAnchorElement, TOCItemProps>(
  ({ item, ...props }, ref) => {
    const { activeAnchor, containerRef } = useContext(ActiveAnchorContext)!
    const anchorRef = useRef<HTMLAnchorElement>(null)
    const mergedRef = mergeRefs(anchorRef, ref)

    const active = activeAnchor === item.url.split('#')[1]

    useEffect(() => {
      const element = anchorRef.current

      if (active && element) {
        scrollIntoView(element, {
          behavior: 'smooth',
          block: 'center',
          inline: 'center',
          scrollMode: 'always',
          boundary: containerRef.current
        })
      }
    }, [active])

    return (
      <a ref={mergedRef} data-active={active} {...props}>
        {props.children}
      </a>
    )
  }
)

TOCItem.displayName = 'TOCItem'
