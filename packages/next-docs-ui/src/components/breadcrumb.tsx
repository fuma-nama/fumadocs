import { LayoutContext } from '@/contexts/tree'
import clsx from 'clsx'
import { ChevronRightIcon } from 'lucide-react'
import { useBreadcrumb } from 'next-docs-zeta/breadcrumb'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment, useContext } from 'react'

export function Breadcrumb() {
  const { tree } = useContext(LayoutContext)
  const pathname = usePathname()
  const items = useBreadcrumb(pathname, tree)

  return (
    <div className="nd-flex nd-flex-row nd-gap-1 nd-text-sm nd-text-muted-foreground nd-items-center">
      {items.map((item, i) => {
        const active = items.length === i + 1
        const style = clsx(
          'nd-overflow-hidden nd-overflow-ellipsis nd-whitespace-nowrap',
          active && 'nd-text-foreground'
        )

        return (
          <Fragment key={i}>
            {i !== 0 && (
              <ChevronRightIcon className="nd-w-4 nd-h-4 nd-shrink-0" />
            )}
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
