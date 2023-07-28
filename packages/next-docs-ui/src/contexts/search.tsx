import { ReactNode, createContext, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { SearchOptions } from "../components/dialog/search";

const SearchDialog = dynamic(() => import("../components/dialog/search"));

export const SearchContext = createContext({
    setOpenSearch: (v: boolean) => {},
});

export function SearchProvider({
    search,
    children,
}: {
    search?: SearchOptions;
    children: ReactNode;
}) {
    const [isOpen, setOpen] = useState<boolean>();

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                setOpen(true);
                e.preventDefault();
            }
        };

        window.addEventListener("keydown", handler);

        return () => {
            window.removeEventListener("keydown", handler);
        };
    }, []);

    return (
        <SearchContext.Provider value={{ setOpenSearch: setOpen }}>
            {isOpen !== undefined && (
                <SearchDialog
                    open={isOpen}
                    onOpenChange={setOpen}
                    {...search}
                />
            )}
            {children}
        </SearchContext.Provider>
    );
}
