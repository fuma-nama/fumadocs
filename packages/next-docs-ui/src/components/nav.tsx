import { ReactNode } from "react";
import { SearchBar } from "./search";
import { SidebarTrigger } from "./sidebar";
import { MenuIcon } from "lucide-react";
import { ModeToggle } from "./theme-toggle";
import Link from "next/link";

type NavLinkProps = {
    icon: ReactNode;
    href: string;
    external?: boolean;
};

export function Nav({
    links,
    children,
}: {
    links?: NavLinkProps[];
    children: ReactNode;
}) {
    return (
        <nav className="sticky top-0 left-0 right-0 bg-background/10 z-50 backdrop-blur-xl">
            <div className="container flex flex-row items-center h-14 gap-4 max-w-[1400px]">
                <div>{children}</div>
                <div className="flex flex-row items-center gap-2 ml-auto">
                    <SearchBar className="w-[280px] max-w-xs max-sm:hidden" />
                    {links?.map((item, key) => (
                        <NavLink key={key} {...item} />
                    ))}
                    <ModeToggle />
                    <SidebarTrigger className="p-1 rounded-md hover:bg-accent lg:hidden">
                        <MenuIcon className="w-5 h-5" />
                    </SidebarTrigger>
                </div>
            </div>
        </nav>
    );
}

export function NavLink(props: NavLinkProps) {
    return (
        <Link
            href={props.href}
            target={props.external ? "_blank" : "_self"}
            rel={props.external ? "noreferrer noopener" : undefined}
            className="p-1 hover:bg-accent hover:text-accent-foreground"
        >
            {props.icon}
        </Link>
    );
}
