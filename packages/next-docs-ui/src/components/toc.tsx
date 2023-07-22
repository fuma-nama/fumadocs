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
        <div className="flex flex-col">
            <Primitive.TOCItem
                href={item.url}
                item={item}
                className="text-sm text-muted-foreground transition-colors text-ellipsis overflow-hidden data-[active=true]:font-semibold data-[active=true]:text-foreground"
            >
                {item.title}
            </Primitive.TOCItem>
            <div className="flex flex-col pl-4">
                {item.items?.map((item, i) => (
                    <TOCItem key={i} item={item} />
                ))}
            </div>
        </div>
    );
}
