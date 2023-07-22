"use client";
import { ReactNode } from "react";
import { SidebarProvider, Sidebar } from "@/components/sidebar";
import clsx from "clsx";
import { SearchProvider } from "@/components/search";
import { Nav } from "@/components/nav";
import Link from "next/link";
import { TreeNode } from "next-docs-zeta/server";
import { ThemeProvider } from "next-themes";
import { GithubIcon } from "lucide-react";

export type DocsLayoutProps = {
    /**
     * Navbar title
     */
    navTitle: string | ReactNode;

    tree: TreeNode[];

    /**
     * Replace navbar
     */
    nav?: ReactNode;

    /**
     * Github url displayed on the navbar
     */
    githubUrl?: string;

    children: ReactNode;
};

export { Nav, NavLink } from "@/components/nav";

export function DocsLayout(props: DocsLayoutProps) {
    const links = props.githubUrl
        ? [
              {
                  href: props.githubUrl,
                  icon: <GithubIcon className="w-5 h-5" />,
                  external: true,
              },
          ]
        : [];

    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <SidebarProvider>
                <SearchProvider>
                    {props.nav ? (
                        props.nav
                    ) : (
                        <Nav links={links}>
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
