import type { TOCItemType, TableOfContents } from "@/server/get-toc";
import { useAnchorObserver } from "./use-anchor-observer";
import { ReactNode, useMemo } from "react";
import { createContext, useContext } from "react";
import { ComponentPropsWithoutRef, forwardRef } from "react";

type ActiveAnchors = Record<string, Anchor>;

type Anchor = {
    isActive?: boolean;
    aboveHalfViewport: boolean;
    index: number;
    insideHalfViewport: boolean;
};

const ActiveAnchorContext = createContext<ActiveAnchors>({});

export const useActiveAnchor = (url: string): Anchor | null => {
    const context = useContext(ActiveAnchorContext);

    return context[url.split("#")[1]];
};

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

function getHeadings(item: TOCItemType): string[] {
    const children = item.items?.flatMap((item) => getHeadings(item)) ?? [];

    return [item.url, ...children];
}

export type TOCItemProps = ComponentPropsWithoutRef<"a"> & {
    item: TOCItemType;
};

export const TOCItem = forwardRef<HTMLAnchorElement, TOCItemProps>(
    ({ item, ...props }, ref) => {
        const activeAnchor = useActiveAnchor(item.url);
        const active = activeAnchor?.isActive === true;

        return (
            <a ref={ref} aria-selected={active} {...props}>
                {props.children}
            </a>
        );
    }
);
