import { I18nContext } from '@/contexts/i18n'
import { cn } from '@/utils/cn'
import { TextIcon } from 'lucide-react'
import type { TOCItemType } from 'next-docs-zeta/server'
import * as Primitive from 'next-docs-zeta/toc'
import { useContext } from 'react'

export function TOC({ items }: { items: TOCItemType[] }) {
  const { toc = 'On this page' } = useContext(I18nContext).text ?? {}

  return (
    <Primitive.TOCProvider toc={items} className="nd-overflow-hidden nd-flex-1">
      <h3 className="nd-inline-flex nd-flex-row nd-items-center nd-font-medium nd-text-sm nd-mb-4">
        <TextIcon className="nd-inline nd-w-4 nd-h-4 nd-mr-2" /> {toc}
      </h3>
      <div className="nd-flex nd-flex-col">
        {items.map((item, i) => (
          <TOCItem key={i} item={item} />
        ))}
      </div>
    </Primitive.TOCProvider>
  )
}

function TOCItem({ item }: { item: TOCItemType }) {
  return (
    <Primitive.TOCItem
      href={item.url}
      item={item}
      className={cn(
        'nd-border-l-2 nd-text-sm nd-py-1 nd-text-muted-foreground nd-transition-colors nd-text-ellipsis nd-overflow-hidden data-[active=true]:nd-font-medium data-[active=true]:nd-text-primary data-[active=true]:nd-border-primary',
        item.depth === 1 && 'nd-border-l-0',
        item.depth === 2 && 'nd-pl-3',
        item.depth === 3 && 'nd-pl-6',
        item.depth >= 4 && 'nd-pl-9'
      )}
    >
      {item.title}
    </Primitive.TOCItem>
  )
}
