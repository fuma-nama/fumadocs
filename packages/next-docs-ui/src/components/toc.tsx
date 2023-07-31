import type { TOCItemType } from 'next-docs-zeta/server'
import * as Primitive from 'next-docs-zeta/toc'

export function TOC({ items }: { items: TOCItemType[] }) {
  return (
    <Primitive.TOCProvider
      toc={items}
      className="nd-flex nd-flex-col nd-gap-1 nd-overflow-hidden nd-flex-1"
    >
      {items.length > 0 && (
        <h3 className="nd-font-semibold nd-mb-2">On this page</h3>
      )}
      {items.map((item, i) => (
        <TOCItem key={i} item={item} />
      ))}
    </Primitive.TOCProvider>
  )
}

function TOCItem({ item }: { item: TOCItemType }) {
  return (
    <div className="nd-flex nd-flex-col nd-gap-1">
      <Primitive.TOCItem
        href={item.url}
        item={item}
        className="nd-text-sm nd-text-muted-foreground nd-transition-colors nd-text-ellipsis nd-overflow-hidden data-[active=true]:nd-font-medium data-[active=true]:nd-text-primary"
      >
        {item.title}
      </Primitive.TOCItem>
      <div className="nd-flex nd-flex-col nd-pl-4">
        {item.items?.map((item, i) => <TOCItem key={i} item={item} />)}
      </div>
    </div>
  )
}
