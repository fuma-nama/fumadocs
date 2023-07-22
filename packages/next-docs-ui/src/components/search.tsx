import {
    ComponentPropsWithoutRef,
    ReactNode,
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";
import dynamic from "next/dynamic";
import { cn } from "@/utils/cn";
import { SearchIcon } from "lucide-react";

const SearchDialog = dynamic(() => import("./dialog/search"));

const SearchContext = createContext({
    setOpenSearch: (v: boolean) => {},
});

export function SearchProvider({ children }: { children: ReactNode }) {
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
                <SearchDialog open={isOpen} onOpenChange={setOpen} />
            )}
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
                "flex flex-row items-center border border-input rounded-md text-muted-foreground bg-background/50 px-4 py-2 text-sm",
                props.className
            )}
            onClick={() => setOpenSearch(true)}
        >
            <SearchIcon className="w-4 h-4 mr-2" />
            Search...
            <CommandShortcut className="ml-auto">⌘ K</CommandShortcut>
        </button>
    );
}

const CommandShortcut = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
    return (
        <span
            className={cn(
                "text-xs px-2 py-0.5 border rounded-md bg-secondary text-secondary-foreground",
                className
            )}
            {...props}
        />
    );
};

CommandShortcut.displayName = "CommandShortcut";
