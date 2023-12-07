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
    <div className="flex flex-row gap-1 text-sm text-muted-foreground items-center">
      {items.map((item, i) => {
        const active = items.length === i + 1
        const style = cn(
          'whitespace-nowrap overflow-hidden',
          active ? 'text-foreground' : 'text-ellipsis'
        )

        return (
          <Fragment key={i}>
            {i !== 0 && <ChevronRightIcon className="w-4 h-4 shrink-0" />}
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
