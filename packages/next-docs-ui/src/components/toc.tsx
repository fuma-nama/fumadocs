import { cn } from '@/utils/cn'
import type { TOCItemType } from 'next-docs-zeta/server'
import * as Primitive from 'next-docs-zeta/toc'

export function TOC({ items }: { items: TOCItemType[] }) {
  return (
    <Primitive.TOCProvider toc={items} className="nd-overflow-hidden nd-flex-1">
      {items.length > 0 && (
        <h3 className="nd-font-medium nd-text-sm nd-mb-4">On This Page</h3>
      )}
      <div className="nd-flex nd-flex-col">
        {items.map((item, i) => (
          <TOCItem key={i} item={item} level={0} />
        ))}
      </div>
    </Primitive.TOCProvider>
  )
}

function TOCItem({ item, level }: { item: TOCItemType; level: number }) {
  return (
    <>
      <Primitive.TOCItem
        href={item.url}
        item={item}
        className={cn(
          'nd-border-l-2 nd-text-sm nd-py-0.5 nd-text-muted-foreground nd-transition-colors nd-text-ellipsis nd-overflow-hidden data-[active=true]:nd-font-medium data-[active=true]:nd-text-primary data-[active=true]:nd-border-primary',
          level === 0 && 'nd-pl-3',
          level === 1 && 'nd-pl-6',
          level >= 2 && 'nd-pl-9'
        )}
      >
        {item.title}
      </Primitive.TOCItem>
      {item.items?.map((item, i) => (
        <TOCItem key={i} item={item} level={level + 1} />
      ))}
    </>
  )
}
