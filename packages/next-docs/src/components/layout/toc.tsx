import { Item, TableOfContents } from "@/lib/get-toc";
import { useAnchorObserver } from "@/lib/use-anchor-observer";
import { ReactNode, useMemo } from "react";
import { createContext, useContext } from "react";
import { ComponentPropsWithoutRef, forwardRef } from "react";

type ActiveAnchor = Record<
    string,
    {
        isActive?: boolean;
        aboveHalfViewport: boolean;
        index: number;
        insideHalfViewport: boolean;
    }
>;

const ActiveAnchorContext = createContext<ActiveAnchor>({});

export const useActiveAnchor = () => useContext(ActiveAnchorContext);

export function TOCProvider({
    toc,
    children,
}: {
    toc: TableOfContents;
    children: ReactNode;
}) {
    const headings = useMemo(() => {
        return toc
            .flatMap((item) => getHeadings(item))
            .map((item) => item.split("#")[1]);
    }, [toc]);

    const activeAnchor = useAnchorObserver(headings);

    return (
        <ActiveAnchorContext.Provider value={activeAnchor}>
            {children}
        </ActiveAnchorContext.Provider>
    );
}

function getHeadings(item: Item): string[] {
    const children = item.items?.flatMap((item) => getHeadings(item)) ?? [];

    return [item.url, ...children];
}

export type TOCItemProps = ComponentPropsWithoutRef<"a"> & { item: Item };

export const ItemContext = createContext({});

export const TOCItem = forwardRef<HTMLAnchorElement, TOCItemProps>(
    ({ item, ...props }, ref) => {
        const activeAnchor = useActiveAnchor();
        const active = activeAnchor[item.url.split("#")[1]]?.isActive === true;

        return (
            <a ref={ref} data-active={active} {...props}>
                {props.children}
            </a>
        );
    }
);
