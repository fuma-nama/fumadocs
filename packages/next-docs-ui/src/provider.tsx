"use client";
import { ThemeProvider } from "next-themes";
import { ThemeProviderProps } from "next-themes/dist/types";
import { SidebarProvider } from "./components/sidebar";
import { SearchProvider } from "./components/search";

export function RootProvider(props: ThemeProviderProps) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            {...props}
        >
            <SidebarProvider>
                <SearchProvider>{props.children}</SearchProvider>
            </SidebarProvider>
        </ThemeProvider>
    );
}
