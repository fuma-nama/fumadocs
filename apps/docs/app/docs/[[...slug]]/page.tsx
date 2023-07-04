import { allDocs } from "contentlayer/generated";
import { notFound } from "next/navigation";
import { Param } from "../layout";

import type { Metadata } from "next";
import { getTableOfContents } from "next-docs/lib";
import { useMDXComponent } from "next-contentlayer/hooks";
import { tree } from "@/utils/page-tree";
import React from "react";
import { Breadcrumb } from "@/components/breadcrumb";
import { cn } from "@/utils/cn";
import { Card, Cards } from "@/components/mdx/card";
import { ExternalLink, WithLink } from "@/components/mdx/link";
import { Pre } from "@/components/mdx/pre";
import { TOCItem, TOCProvider } from "@/components/toc";

export default async function Page({ params }: { params: Param }) {
    const path = (params.slug ?? []).join("/");
    const page = allDocs.find((page) => page.slug === path);

    if (page == null) {
        notFound();
    }

    const toc = await getTableOfContents(page.body.raw);

    return (
        <>
            <article className="flex flex-col gap-6 py-8 lg:py-16">
                <Breadcrumb tree={tree} />
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
                    <TOCProvider toc={toc}>
                        {toc.map((item) => (
                            <TOCItem item={item} />
                        ))}
                    </TOCProvider>
                </div>
            </div>
        </>
    );
}

function MdxContent({ code }: { code: string }) {
    const MDX = useMDXComponent(code);

    return (
        <MDX
            components={{
                Card,
                Cards,
                a: ExternalLink,
                pre: (props) => <Pre {...props} />,
                h1: (props) => (
                    <h1 {...props} className={cn("group", props.className)}>
                        <WithLink id={props.id}>{props.children}</WithLink>
                    </h1>
                ),
                h2: (props) => (
                    <h2 {...props} className={cn("group", props.className)}>
                        <WithLink id={props.id}>{props.children}</WithLink>
                    </h2>
                ),
                h3: (props) => (
                    <h3 {...props} className={cn("group", props.className)}>
                        <WithLink id={props.id}>{props.children}</WithLink>
                    </h3>
                ),
                h4: (props) => (
                    <h4 {...props} className={cn("group", props.className)}>
                        <WithLink id={props.id}>{props.children}</WithLink>
                    </h4>
                ),
                h5: (props) => (
                    <h5 {...props} className={cn("group", props.className)}>
                        <WithLink id={props.id}>{props.children}</WithLink>
                    </h5>
                ),
                h6: (props) => (
                    <h6 {...props} className={cn("group", props.className)}>
                        <WithLink id={props.id}>{props.children}</WithLink>
                    </h6>
                ),
            }}
        />
    );
}

export function generateMetadata({ params }: { params: Param }): Metadata {
    const path = (params.slug ?? []).join("/");
    const page = allDocs.find((page) => page.slug === path);

    if (page == null) return {};

    const description =
        page.description ?? "The hosting platform that supports Nothing";

    return {
        title: page.title,
        description: description,
        openGraph: {
            url: "https://nodeploy-neon.vercel.app",
            title: page.title,
            description: description,
            images: "/banner.png",
            siteName: "No Deploy",
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
