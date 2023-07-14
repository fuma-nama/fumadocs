"use client";
import {
    ComponentPropsWithoutRef,
    ReactNode,
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";
import { CommandShortcut } from "./ui/command";
import dynamic from "next/dynamic";
import { cn } from "@/utils/cn";

const SearchDialog = dynamic(() => import("./dialog/search"));

const SearchContext = createContext({
    setOpenSearch: (v: boolean) => {},
});

export function SearchProvider({ children }: { children: ReactNode }) {
    const [openSearch, setOpenSearch] = useState(false);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                setOpenSearch(true);
                e.preventDefault();
            }
        };

        window.addEventListener("keydown", handler);

        return () => {
            window.removeEventListener("keydown", handler);
        };
    }, []);

    return (
        <SearchContext.Provider value={{ setOpenSearch }}>
            {openSearch && <SearchDialog open onOpenChange={setOpenSearch} />}
            {children}
        </SearchContext.Provider>
    );
}

export function SearchBar(props: ComponentPropsWithoutRef<"button">) {
    const { setOpenSearch } = useContext(SearchContext);

    return (
        <button
            {...props}
            className={cn(
                "flex flex-row items-center border rounded-md text-muted-foreground bg-background cursor-pointer px-4 py-2 text-left text-sm",
                props.className
            )}
            onClick={() => setOpenSearch(true)}
        >
            Search Docs...
            <CommandShortcut className="ml-auto">⌘K</CommandShortcut>
        </button>
    );
}
