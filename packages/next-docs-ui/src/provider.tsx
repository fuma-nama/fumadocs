"use client";
import { ThemeProvider } from "next-themes";
import { SidebarProvider } from "./components/sidebar";
import { SearchProvider } from "./contexts/search";
import { type ReactNode } from "react";
import type { SearchOptions } from "./components/dialog/search";

export type RootProviderProps = {
    search?: SearchOptions;
    children: ReactNode;
};

export function RootProvider(props: RootProviderProps) {
    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <SidebarProvider>
                <SearchProvider search={props.search}>
                    {props.children}
                </SearchProvider>
            </SidebarProvider>
        </ThemeProvider>
    );
}
