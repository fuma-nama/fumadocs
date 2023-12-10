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
      className="relative overflow-hidden pt-4 text-sm font-medium first:pt-0"
    >
      <h3 className="mb-4 inline-flex items-center gap-2">
        <TextIcon className="h-4 w-4" />
        {toc}
      </h3>
      <div className="text-muted-foreground flex flex-col gap-1 border-l-2">
        <div
          role="none"
          className={cn(
            'absolute left-0 border-l-2 transition-all',
            pos && 'border-primary'
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
        'data-[active=true]:text-primary overflow-hidden text-ellipsis py-1 transition-colors',
        item.depth <= 2 && 'pl-4',
        item.depth === 3 && 'pl-7',
        item.depth >= 4 && 'pl-10'
      )}
    >
      {item.title}
    </Primitive.TOCItem>
  )
}
