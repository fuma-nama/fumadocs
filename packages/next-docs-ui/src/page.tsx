"use client";
import { TableOfContents, TreeNode } from "next-docs-zeta/server";
import { Breadcrumb } from "@/components/breadcrumb";
import { TOC } from "@/components/toc";
import { ReactNode } from "react";

export function DocsPage({
    toc,
    tree,
    children,
}: {
    toc: TableOfContents;
    tree: TreeNode[];
    children: ReactNode;
}) {
    return (
        <>
            <article className="flex flex-col gap-6 py-8 overflow-x-hidden lg:py-16">
                <Breadcrumb tree={tree} />
                {children}
            </article>
            <div className="relative flex flex-col gap-3 max-xl:hidden py-16">
                <div className="sticky top-28 flex flex-col gap-3 overflow-auto max-h-[calc(100vh-4rem-3rem)]">
                    {toc.length > 0 && (
                        <h3 className="font-semibold">On this page</h3>
                    )}
                    <TOC items={toc} />
                </div>
            </div>
        </>
    );
}
