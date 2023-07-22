"use client";
import { ReactNode } from "react";
import { SidebarProvider, Sidebar } from "@/components/sidebar";
import clsx from "clsx";
import { SearchProvider } from "@/components/search";
import { Nav } from "@/components/nav";
import Link from "next/link";
import { TreeNode } from "next-docs-zeta/server";

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

export function DocsLayout(props: DocsLayoutProps) {
    return (
        <SidebarProvider>
            <SearchProvider>
                {props.nav ? (
                    props.nav
                ) : (
                    <Nav>
                        <Link href="/" className="font-medium">
                            {props.navTitle}
                        </Link>
                    </Nav>
                )}
                <div className="absolute inset-0 -z-[1] overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-br from-purple-400/20 to-background to-50%" />
                </div>
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
    );
}
