"use client";
import { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import clsx from "clsx";
import { Nav } from "@/components/nav";
import Link from "next/link";
import { TreeNode } from "next-docs-zeta/server";
import { GithubIcon } from "lucide-react";

export type DocsLayoutProps = {
    /**
     * Navbar title
     */
    navTitle?: string | ReactNode;

    tree: TreeNode[];

    /**
     * Replace navbar
     */
    nav?: ReactNode | false;

    /**
     * Github url displayed on the navbar
     */
    githubUrl?: string;

    sidebarContent?: ReactNode;

    children: ReactNode;
};

export function DocsLayout(props: DocsLayoutProps) {
    const links = props.githubUrl
        ? [
              {
                  href: props.githubUrl,
                  icon: <GithubIcon className="nd-w-5 nd-h-5" />,
                  external: true,
              },
          ]
        : [];

    return (
        <>
            {props.nav !== undefined ? (
                props.nav
            ) : (
                <Nav links={links}>
                    <Link
                        href="/"
                        className="nd-font-semibold hover:nd-text-muted-foreground"
                    >
                        {props.navTitle}
                    </Link>
                </Nav>
            )}
            <div
                className={clsx(
                    "nd-grid nd-grid-cols-1 nd-container nd-max-w-[1400px]",
                    "md:nd-gap-x-8 md:nd-grid-cols-[200px_minmax(0,1fr)] lg:nd-grid-cols-[250px_minmax(0,1fr)] xl:nd-grid-cols-[250px_minmax(0,1fr)_200px] 2xl:nd-grid-cols-[250px_minmax(0,1fr)_250px]"
                )}
            >
                <Sidebar items={props.tree}>{props.sidebarContent}</Sidebar>
                {props.children}
            </div>
        </>
    );
}
