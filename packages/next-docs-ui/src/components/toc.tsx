import * as Primitive from "next-docs-zeta/toc";
import type { TOCItemType } from "next-docs-zeta/server";
import { useEffect, useRef } from "react";
import scrollIntoView from "scroll-into-view-if-needed";

export function TOC({ items }: { items: TOCItemType[] }) {
    return (
        <div
            id="nd-toc"
            className="nd-flex nd-flex-col nd-gap-1 nd-overflow-hidden nd-flex-1"
        >
            <Primitive.TOCProvider toc={items}>
                {items.length > 0 && (
                    <h3 className="nd-font-semibold nd-mb-2">On this page</h3>
                )}
                {items.map((item, i) => (
                    <TOCItem key={i} item={item} />
                ))}
            </Primitive.TOCProvider>
        </div>
    );
}

function TOCItem({ item }: { item: TOCItemType }) {
    const ref = useRef<HTMLAnchorElement>(null);
    const anchor = Primitive.useActiveAnchor(item.url);
    const active = anchor?.isActive ?? false;

    useEffect(() => {
        if (active && ref.current) {
            const toc = document.getElementById("nd-toc");

            scrollIntoView(ref.current, {
                behavior: "smooth",
                block: "center",
                inline: "center",
                scrollMode: "always",
                boundary: toc,
            });
        }
    }, [active]);

    return (
        <div className="nd-flex nd-flex-col nd-gap-1">
            <Primitive.TOCItem
                ref={ref}
                href={item.url}
                item={item}
                className="nd-text-sm nd-text-muted-foreground nd-transition-colors nd-text-ellipsis nd-overflow-hidden data-[active]:nd-font-medium data-[active]:nd-text-primary"
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
