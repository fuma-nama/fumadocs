"use client";
import clsx from "clsx";
import { ChevronDownIcon, MenuIcon } from "lucide-react";
import {
    ReactNode,
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { TreeNode, FileNode, FolderNode } from "next-docs/lib";
import dynamic from "next/dynamic";
import { CommandShortcut } from "./ui/command";
import { MouseEvent } from "react";

const SearchDialog = dynamic(() => import("./dialog/search"));

const SidebarContext = createContext({
    open: false,
    setOpenSearch: (v: boolean) => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [open, setOpen] = useState(false);
    const [openSearch, setOpenSearch] = useState(false);

    const pathname = usePathname();

    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (open) {
            document.body.classList.add("max-lg:overflow-hidden");
        } else {
            document.body.classList.remove("max-lg:overflow-hidden");
        }
    }, [open]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                setOpenSearch(true);
                e.preventDefault();
            }
        };

        window.addEventListener("keydown", handler);

        return () => {
            document.body.classList.remove("max-lg:overflow-hidden");
            window.removeEventListener("keydown", handler);
        };
    }, []);

    return (
        <SidebarContext.Provider value={{ open, setOpenSearch }}>
            <button
                className={clsx(
                    "w-full h-8 bg-background border-b-[1px] px-8 sm:px-14",
                    "flex flex-row gap-2 items-center text-sm",
                    "sticky inset-x-0 top-12 z-50 lg:hidden"
                )}
                onClick={() => setOpen((prev) => !prev)}
            >
                <MenuIcon className="w-4 h-4" />
                Menu
            </button>
            {openSearch && <SearchDialog open onOpenChange={setOpenSearch} />}
            {children}
        </SidebarContext.Provider>
    );
}

export function SidebarList({ items }: { items: TreeNode[] }) {
    const { open, setOpenSearch } = useContext(SidebarContext);

    return (
        <aside
            className={clsx(
                "flex flex-col gap-3 fixed inset-0 top-20 overflow-auto",
                "lg:sticky lg:top-12 lg:py-16 lg:max-h-[calc(100vh-3rem)]",
                "max-lg:py-4 max-lg:px-8 max-lg:sm:px-14 max-lg:bg-background/50 max-lg:backdrop-blur-xl max-lg:z-50",
                !open && "max-lg:hidden"
            )}
        >
            <button
                className="flex flex-row items-center border-[1px] rounded-md text-muted-foreground bg-background cursor-pointer px-4 py-2 text-left text-sm"
                onClick={() => setOpenSearch(true)}
            >
                Search Docs...
                <CommandShortcut className="ml-auto">⌘K</CommandShortcut>
            </button>
            {items.map((item, i) => (
                <Node key={i} item={item} />
            ))}
        </aside>
    );
}

function Node({ item }: { item: TreeNode }) {
    if (item.type === "separator")
        return (
            <p className="font-semibold text-sm mt-3 first:mt-0">{item.name}</p>
        );
    if (item.type === "folder") return <Folder item={item} />;

    return <Item item={item} />;
}

function Item({ item }: { item: FileNode }) {
    const { url, name } = item;
    const pathname = usePathname();
    const active = pathname === url;

    return (
        <Link
            href={url}
            className={clsx(
                "text-sm w-full",
                active
                    ? "text-purple-400 font-semibold"
                    : "text-muted-foreground hover:text-foreground"
            )}
        >
            {name}
        </Link>
    );
}

function Folder({ item }: { item: FolderNode }) {
    const { name, children, index } = item;

    const pathname = usePathname();
    const active = pathname === item.url;
    const childActive = pathname.startsWith(item.url + "/");
    const [extend, setExtend] = useState(active || childActive);

    const styles = clsx(
        "text-sm flex flex-row justify-between cursor-pointer",
        active
            ? "font-semibold rounded-xl text-purple-400"
            : "text-muted-foreground hover:text-foreground"
    );

    const icon = (
        <ChevronDownIcon
            className={clsx("w-5 h-5", extend ? "rotate-0" : "-rotate-90")}
            onClick={(e) => {
                setExtend((prev) => !prev);
                e.preventDefault();
                e.stopPropagation();
            }}
        />
    );

    useEffect(() => {
        if (active || childActive) {
            setExtend(true);
        }
    }, [active, childActive]);

    const onClick = (e: MouseEvent) => {
        if (item.index == null || active) {
            setExtend((prev) => !prev);
            e.stopPropagation();
            e.preventDefault();
        }
    };

    return (
        <div className="w-full">
            {index == null ? (
                <h4 className={styles} onClick={onClick}>
                    {name}
                    {icon}
                </h4>
            ) : (
                <Link href={index.url} className={styles} onClick={onClick}>
                    {name}
                    {icon}
                </Link>
            )}
            <ul
                className={clsx(
                    "flex-col mt-3 transition-all overflow-hidden",
                    extend ? "flex" : "hidden"
                )}
            >
                {children.map((item, i) => {
                    const active =
                        item.type !== "separator" && pathname === item.url;

                    return (
                        <li
                            key={i}
                            className={clsx(
                                "flex pl-4 py-1.5 border-l-2 border-border",
                                active ? "border-purple-400" : "border-border"
                            )}
                        >
                            <Node item={item} />
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
