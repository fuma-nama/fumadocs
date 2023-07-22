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
        <nav className="nd-sticky nd-top-0 nd-inset-x-0 nd-bg-background/10 nd-z-50 nd-backdrop-blur-xl">
            <div className="nd-container nd-flex nd-flex-row nd-items-center nd-h-14 nd-gap-4 nd-max-w-[1400px]">
                <div>{children}</div>
                <div className="nd-flex nd-flex-row nd-items-center nd-ml-auto">
                    <SearchBar className="nd-w-[280px] nd-max-w-xs max-sm:nd-hidden nd-mr-3" />
                    {links?.map((item, key) => (
                        <NavLink key={key} {...item} />
                    ))}
                    <ModeToggle />
                    <SidebarTrigger className="nd-p-2 nd-rounded-md hover:nd-bg-accent lg:nd-hidden">
                        <MenuIcon className="nd-w-5 nd-h-5" />
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
            className="nd-p-2 nd-rounded-md hover:nd-bg-accent"
        >
            {props.icon}
        </Link>
    );
}
