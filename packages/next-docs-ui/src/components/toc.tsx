import { I18nContext } from '@/contexts/i18n'
import { cn } from '@/utils/cn'
import { TextIcon } from 'lucide-react'
import type { TOCItemType } from 'next-docs-zeta/server'
import * as Primitive from 'next-docs-zeta/toc'
import { useContext, useEffect, useRef, useState } from 'react'

type PosType = [top: number, height: number]

export function TOCItems({ items }: { items: TOCItemType[] }) {
  const { toc = 'On this page' } = useContext(I18nContext).text ?? {}
  const [pos, setPos] = useState<PosType>()

  return (
    <Primitive.TOCProvider
      toc={items}
      className="nd-relative nd-pt-4 nd-text-sm nd-font-medium nd-overflow-hidden first:nd-pt-0"
    >
      <h3 className="nd-inline-flex nd-items-center nd-gap-2 nd-mb-4">
        <TextIcon className="nd-w-4 nd-h-4" />
        {toc}
      </h3>
      <div className="nd-flex nd-flex-col nd-gap-1 nd-border-l-2 nd-text-muted-foreground">
        <div
          role="none"
          className={cn(
            'nd-absolute nd-left-0 nd-border-l-2 nd-transition-all',
            pos && 'nd-border-primary'
          )}
          style={{
            top: pos?.[0],
            height: pos?.[1]
          }}
        />
        {items.map((item, i) => (
          <TOCItem key={i} item={item} setMarker={setPos} />
        ))}
      </div>
    </Primitive.TOCProvider>
  )
}

function TOCItem({
  item,
  setMarker
}: {
  item: TOCItemType
  setMarker: (v: PosType) => void
}) {
  const active = Primitive.useActiveAnchor(item.url)
  const ref = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (active && ref.current) {
      setMarker([ref.current.offsetTop, ref.current.clientHeight])
    }
  }, [active])

  return (
    <Primitive.TOCItem
      ref={ref}
      href={item.url}
      className={cn(
        'nd-py-1 nd-text-ellipsis nd-transition-colors nd-overflow-hidden data-[active=true]:nd-text-primary',
        item.depth <= 2 && 'nd-pl-4',
        item.depth === 3 && 'nd-pl-7',
        item.depth >= 4 && 'nd-pl-10'
      )}
    >
      {item.title}
    </Primitive.TOCItem>
  )
}
