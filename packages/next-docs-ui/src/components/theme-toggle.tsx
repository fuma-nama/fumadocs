import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ModeToggle() {
    const { setTheme } = useTheme();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="nd-w-9 nd-h-9 nd-inline-flex nd-justify-center nd-items-center nd-rounded-md hover:nd-bg-accent hover:nd-text-accent-foreground focus-visible:nd-outline-none">
                    <SunIcon className="nd-h-5 nd-w-5 nd-rotate-0 nd-scale-100 nd-transition-all dark:-nd-rotate-90 dark:nd-scale-0" />
                    <MoonIcon className="nd-absolute nd-h-5 nd-w-5 nd-rotate-90 nd-scale-0 nd-transition-all dark:nd-rotate-0 dark:nd-scale-100" />
                    <span className="nd-sr-only">Toggle theme</span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                    Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                    Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                    System
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
