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
            <article className="nd-flex nd-flex-col nd-gap-6 nd-py-8 nd-mb-20 md:nd-py-16">
                <Breadcrumb tree={tree} />
                {children}
            </article>
            <div className="nd-relative max-xl:nd-hidden">
                <div className="nd-sticky nd-flex nd-top-14 nd-py-16 nd-max-h-[calc(100vh-3.5rem)]">
                    <TOC items={toc} />
                </div>
            </div>
        </>
    );
}
