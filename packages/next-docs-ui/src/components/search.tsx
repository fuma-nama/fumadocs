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
                "nd-flex nd-flex-row nd-items-center nd-border nd-border-input nd-rounded-md nd-text-muted-foreground nd-bg-background/50 nd-px-3 nd-py-2 nd-text-sm",
                props.className
            )}
            onClick={() => setOpenSearch(true)}
        >
            <SearchIcon className="nd-w-4 nd-h-4 nd-mr-2" />
            Search...
            <CommandShortcut className="nd-ml-auto">Ctrl K</CommandShortcut>
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
                "nd-text-xs nd-px-2 nd-py-0.5 nd-border nd-rounded-md nd-bg-secondary nd-text-secondary-foreground",
                className
            )}
            {...props}
        />
    );
};

CommandShortcut.displayName = "CommandShortcut";
