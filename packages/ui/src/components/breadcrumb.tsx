import { LayoutContext } from '@/contexts/tree'
import { cn } from '@/utils/cn'
import { ChevronRightIcon } from 'lucide-react'
import { useBreadcrumb } from 'next-docs-zeta/breadcrumb'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment, useContext } from 'react'

export function Breadcrumb() {
  const { tree } = useContext(LayoutContext)
  const pathname = usePathname()
  const items = useBreadcrumb(pathname, tree)
  if (items.length === 1) return <></>

  return (
    <div className="text-muted-foreground flex flex-row items-center gap-1 text-sm">
      {items.map((item, i) => {
        const active = items.length === i + 1
        const style = cn(
          'overflow-hidden whitespace-nowrap',
          active ? 'text-foreground' : 'text-ellipsis'
        )

        return (
          <Fragment key={i}>
            {i !== 0 && <ChevronRightIcon className="h-4 w-4 shrink-0" />}
            {item.url != null ? (
              <Link href={item.url} className={style}>
                {item.name}
              </Link>
            ) : (
              <p className={style}>{item.name}</p>
            )}
          </Fragment>
        )
      })}
    </div>
  )
}
