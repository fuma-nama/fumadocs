import { SearchBar } from "@/components/search";
import { SidebarTrigger } from "@/components/sidebar";
import { MenuIcon } from "lucide-react";
import Link from "next/link";

export function Nav() {
    return (
        <nav className="sticky top-0 left-0 right-0 bg-background/10 z-50 backdrop-blur-xl">
            <div className="relative container px-40 w-full max-w-[1400px]">
                <div className="flex flex-row items-center justify-center h-14">
                    <Link href="/" className="absolute left-8 font-medium">
                        Next Docs
                    </Link>
                    <SearchBar className="w-full max-w-[740px] max-sm:hidden" />
                    <SidebarTrigger className="absolute right-8 p-1 -m-1 rounded-md hover:bg-accent lg:hidden">
                        <MenuIcon className="w-5 h-5" />
                    </SidebarTrigger>
                </div>
            </div>
        </nav>
    );
}
