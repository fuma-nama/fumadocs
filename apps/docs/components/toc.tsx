"use client";
import * as TOC from "next-docs/components";
import type { Item } from "next-docs/lib";

export const TOCProvider = TOC.TOCProvider;
export function TOCItem({ item }: { item: Item }) {
    return (
        <div>
            <TOC.TOCItem
                href={item.url}
                item={item}
                className="text-sm text-muted-foreground transition-colors data-[active=true]:font-semibold data-[active=true]:text-foreground"
            >
                {item.title}
            </TOC.TOCItem>
            <div className="flex flex-col pl-4">
                {item.items?.map((item, i) => (
                    <TOCItem key={i} item={item} />
                ))}
            </div>
        </div>
    );
}
