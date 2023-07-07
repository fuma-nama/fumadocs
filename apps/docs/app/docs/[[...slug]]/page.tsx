import { allDocs } from "contentlayer/generated";
import { notFound } from "next/navigation";
import { Param } from "../layout";

import type { Metadata } from "next";
import { getTableOfContents } from "next-docs-zeta/server";
import { getMDXComponent } from "next-contentlayer/hooks";
import { tree } from "@/utils/page-tree";
import React from "react";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card, Cards } from "@/components/mdx/card";
import { Heading } from "@/components/mdx/heading";
import { Pre } from "@/components/mdx/pre";
import { SafeLink } from "next-docs-zeta/link";
import { TOC } from "@/components/toc";

export default async function Page({ params }: { params: Param }) {
    const path = (params.slug ?? []).join("/");
    const page = allDocs.find((page) => page.slug === path);

    if (page == null) {
        notFound();
    }

    const pathname = path.length === 0 ? "/docs" : "/docs/" + path;
    const toc = await getTableOfContents(page.body.raw);

    return (
        <>
            <article className="flex flex-col gap-6 py-8 overflow-x-hidden lg:py-16">
                <Breadcrumb pathname={pathname} tree={tree} />
                <h1 className="text-4xl font-bold">{page.title}</h1>
                <div className="prose prose-text prose-pre:grid prose-pre:border-[1px] prose-code:bg-secondary prose-code:p-1 max-w-none">
                    <MdxContent code={page.body.code} />
                </div>
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

function MdxContent({ code }: { code: string }) {
    const MDX = getMDXComponent(code);

    return (
        <MDX
            components={{
                Card,
                Cards,
                a: SafeLink,
                pre: (props) => <Pre {...props} />,
                h1: (props) => <Heading as="h1" {...props} />,
                h2: (props) => <Heading as="h2" {...props} />,
                h3: (props) => <Heading as="h3" {...props} />,
                h4: (props) => <Heading as="h4" {...props} />,
                h5: (props) => <Heading as="h5" {...props} />,
                h6: (props) => <Heading as="h6" {...props} />,
            }}
        />
    );
}

export function generateMetadata({ params }: { params: Param }): Metadata {
    const path = (params.slug ?? []).join("/");
    const page = allDocs.find((page) => page.slug === path);

    if (page == null) return {};

    const description =
        page.description ??
        "The headless ui library for building documentation websites";

    return {
        title: page.title,
        description: description,
        openGraph: {
            url: "https://next-docs-zeta.vercel.app",
            title: page.title,
            description: description,
            images: "/banner.png",
            siteName: "Next Docs",
        },
        twitter: {
            card: "summary_large_image",
            creator: "@money_is_shark",
            title: page.title,
            description: description,
            images: "/banner.png",
        },
    };
}

export async function generateStaticParams(): Promise<Param[]> {
    return allDocs.map((docs) => ({
        slug: docs.slug.split("/"),
    }));
}
