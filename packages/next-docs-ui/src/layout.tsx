"use client";
import { ReactNode } from "react";
import { SidebarProvider, Sidebar } from "@/components/sidebar";
import clsx from "clsx";
import { SearchProvider } from "@/components/search";
import { Nav } from "@/components/nav";
import Link from "next/link";
import { TreeNode } from "next-docs-zeta/server";
import { ThemeProvider } from "next-themes";

export type DocsLayoutProps = {
    tree: TreeNode[];
    /**
     * Replace navbar
     */
    nav?: ReactNode;
    /**
     * Customise navbar title
     */
    navTitle?: string;
    children: ReactNode;
};

export { Nav } from "@/components/nav";

export function DocsLayout(props: DocsLayoutProps) {
    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <SidebarProvider>
                <SearchProvider>
                    {props.nav ? (
                        props.nav
                    ) : (
                        <Nav>
                            <Link
                                href="/"
                                className="font-semibold hover:text-muted-foreground"
                            >
                                {props.navTitle}
                            </Link>
                        </Nav>
                    )}
                    <div
                        className={clsx(
                            "grid grid-cols-1 gap-12 w-full container max-w-[1400px] mb-32",
                            "lg:grid-cols-[250px_auto] xl:grid-cols-[250px_auto_150px] 2xl:grid-cols-[250px_auto_250px]"
                        )}
                    >
                        <Sidebar items={props.tree} />
                        {props.children}
                    </div>
                </SearchProvider>
            </SidebarProvider>
        </ThemeProvider>
    );
}
