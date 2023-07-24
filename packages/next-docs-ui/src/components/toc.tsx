import * as Primitive from "next-docs-zeta/toc";
import type { TOCItemType } from "next-docs-zeta/server";

export function TOC({ items }: { items: TOCItemType[] }) {
    return (
        <Primitive.TOCProvider toc={items}>
            {items.map((item, i) => (
                <TOCItem key={i} item={item} />
            ))}
        </Primitive.TOCProvider>
    );
}

function TOCItem({ item }: { item: TOCItemType }) {
    return (
        <div className="nd-flex nd-flex-col nd-gap-1">
            <Primitive.TOCItem
                href={item.url}
                item={item}
                className="nd-text-sm nd-text-muted-foreground nd-transition-colors nd-text-ellipsis nd-overflow-hidden aria-selected:nd-font-medium aria-selected:nd-text-primary"
            >
                {item.title}
            </Primitive.TOCItem>
            <div className="nd-flex nd-flex-col nd-pl-4">
                {item.items?.map((item, i) => (
                    <TOCItem key={i} item={item} />
                ))}
            </div>
        </div>
    );
}
