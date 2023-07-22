import { ReactNode } from "react";
import { SearchBar } from "./search";
import { SidebarTrigger } from "./sidebar";
import { MenuIcon } from "lucide-react";

export function Nav({ children }: { children: ReactNode }) {
    return (
        <nav className="sticky top-0 left-0 right-0 bg-background/10 z-50 backdrop-blur-xl">
            <div className="relative container px-40 w-full max-w-[1400px]">
                <div className="flex flex-row items-center justify-center h-14">
                    <div className="absolute left-8">{children}</div>
                    <SearchBar className="w-full max-w-[740px] max-sm:hidden" />
                    <SidebarTrigger className="absolute right-8 p-1 -m-1 rounded-md hover:bg-accent lg:hidden">
                        <MenuIcon className="w-5 h-5" />
                    </SidebarTrigger>
                </div>
            </div>
        </nav>
    );
}
