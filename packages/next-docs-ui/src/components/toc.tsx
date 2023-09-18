import { I18nContext } from '@/contexts/i18n'
import { cn } from '@/utils/cn'
import { TextIcon } from 'lucide-react'
import type { TOCItemType } from 'next-docs-zeta/server'
import * as Primitive from 'next-docs-zeta/toc'
import { useContext, useEffect, useRef, useState, type ReactNode } from 'react'

type PosType = [top: number, height: number]

export function TOC(props: {
  items: TOCItemType[]
  header: ReactNode
  footer: ReactNode
}) {
  return (
    <div className="nd-relative nd-w-[250px] max-xl:nd-hidden">
      <div className="nd-sticky nd-divide-y nd-flex nd-flex-col nd-top-16 nd-gap-4 nd-py-16 nd-max-h-[calc(100vh-4rem)]">
        {props.header && <div>{props.header}</div>}
        {props.items.length > 0 && <TOCItems items={props.items} />}
        {props.footer && (
          <div className="nd-pt-4 first:nd-pt-0">{props.footer}</div>
        )}
      </div>
    </div>
  )
}

function TOCItems({ items }: { items: TOCItemType[] }) {
  const { toc = 'On this page' } = useContext(I18nContext).text ?? {}
  const [pos, setPos] = useState<PosType>()

  return (
    <Primitive.TOCProvider
      toc={items}
      className="nd-pt-4 nd-overflow-hidden first:nd-pt-0"
    >
      <h3 className="nd-inline-flex nd-items-center nd-font-medium nd-text-sm nd-mb-4">
        <TextIcon className="nd-inline nd-w-4 nd-h-4 nd-mr-2" /> {toc}
      </h3>
      <div className="nd-flex nd-flex-col nd-border-l nd-text-sm nd-text-muted-foreground">
        <Marker pos={pos} />
        {items.map((item, i) => (
          <TOCItem key={i} item={item} setMarker={setPos} />
        ))}
      </div>
    </Primitive.TOCProvider>
  )
}

function Marker({ pos }: { pos?: PosType }) {
  return (
    <div
      className="nd-absolute nd-w-px nd-bg-primary nd-transition-all"
      style={
        pos
          ? {
              top: pos[0],
              height: pos[1]
            }
          : {
              opacity: 0
            }
      }
    />
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
        'nd-pl-2 nd-py-1 nd-text-ellipsis nd-transition-colors nd-overflow-hidden nd-font-medium data-[active=true]:nd-text-primary',
        item.depth === 2 && 'nd-pl-4',
        item.depth === 3 && 'nd-pl-7',
        item.depth >= 4 && 'nd-pl-9'
      )}
    >
      {item.title}
    </Primitive.TOCItem>
  )
}
