"use client";
import * as Primitive from "next-docs/toc";
import type { TOCItemType } from "next-docs/server";

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
        <div>
            <Primitive.TOCItem
                href={item.url}
                item={item}
                className="text-sm text-muted-foreground transition-colors data-[active=true]:font-semibold data-[active=true]:text-foreground"
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
