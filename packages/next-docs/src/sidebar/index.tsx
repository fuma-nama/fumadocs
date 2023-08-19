import type { WithAs } from '@/types'
import { usePathname } from 'next/navigation'
import type { ElementType, ReactNode } from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import { RemoveScroll } from 'react-remove-scroll'

const SidebarContext = createContext<
  [open: boolean, setOpen: (value: boolean) => void]
>([false, () => {}])

export type SidebarProviderProps = {
  open?: boolean
  onOpenChange?: (v: boolean) => void
  children: ReactNode
}

export function SidebarProvider(props: SidebarProviderProps) {
  const [open, setOpen] =
    props.open == null ? useState(false) : [props.open, props.onOpenChange!]

  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <SidebarContext.Provider value={[open, setOpen]}>
      {props.children}
    </SidebarContext.Provider>
  )
}

export type SidebarTriggerProps<T extends ElementType> = WithAs<T>

export function SidebarTrigger<T extends ElementType = 'button'>({
  as,
  ...props
}: SidebarTriggerProps<T>) {
  const [open, setOpen] = useContext(SidebarContext)
  const As = as ?? 'button'

  return <As data-open={open} onClick={() => setOpen(!open)} {...props} />
}

export type SidebarContentProps<T extends ElementType> = WithAs<
  T,
  {
    minWidth?: number
  }
>

export function SidebarList<T extends ElementType = 'aside'>({
  as,
  minWidth,
  ...props
}: SidebarContentProps<T>) {
  const [open] = useContext(SidebarContext)
  const [isMobileLayout, setIsMobileLayout] = useState(false)

  useEffect(() => {
    if (minWidth == null) return
    const mediaQueryList = window.matchMedia(`(min-width: ${minWidth}px)`)

    const handleChange = () => setIsMobileLayout(!mediaQueryList.matches)
    handleChange()

    mediaQueryList.addEventListener('change', handleChange)
    return () => mediaQueryList.removeEventListener('change', handleChange)
  }, [minWidth])

  return (
    <RemoveScroll
      as={as ?? 'aside'}
      data-open={isMobileLayout && open}
      enabled={isMobileLayout && open}
      {...props}
    >
      {props.children}
    </RemoveScroll>
  )
}
