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
            <article className="nd-flex nd-flex-col nd-gap-6 nd-py-8 nd-overflow-x-hidden lg:nd-py-16">
                <Breadcrumb tree={tree} />
                {children}
            </article>
            <div className="nd-relative nd-flex nd-flex-col nd-gap-3 nd-py-16 max-xl:nd-hidden">
                <div className="nd-sticky nd-top-28 nd-flex nd-flex-col nd-gap-3 nd-overflow-auto nd-max-h-[calc(100vh-4rem-3rem)]">
                    {toc.length > 0 && (
                        <h3 className="nd-font-semibold">On this page</h3>
                    )}
                    <TOC items={toc} />
                </div>
            </div>
        </>
    );
}
