"use client";
import { ThemeProvider as OriginalThemeProvider } from "next-themes";
import { ThemeProviderProps } from "next-themes/dist/types";

export function ThemeProvider(props: ThemeProviderProps) {
    return (
        <OriginalThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            {...props}
        >
            {" "}
            {props.children}
        </OriginalThemeProvider>
    );
}
