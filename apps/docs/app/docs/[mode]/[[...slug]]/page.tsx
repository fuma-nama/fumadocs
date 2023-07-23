import { allDocs } from "contentlayer/generated";
import { notFound, redirect } from "next/navigation";
import { getTree } from "@/utils/page-tree";

import { getTableOfContents } from "next-docs-zeta/server";
import { getMDXComponent } from "next-contentlayer/hooks";
import React from "react";
import { DocsPage } from "next-docs-ui/page";
import {
    Link,
    Pre,
    Heading,
    Card,
    Cards,
    MDXContent,
    Table,
    Image,
} from "next-docs-ui/mdx";

import type { Metadata } from "next";

type Param = {
    mode: string;
    slug?: string[];
};

export default async function Page({ params }: { params: Param }) {
    const tree = getTree(params.mode);
    const path = [params.mode, ...(params.slug ?? [])].join("/");
    const page = allDocs.find((page) => page.slug === path);

    if (params.mode !== "ui" && params.mode !== "headless") {
        redirect(`/docs/headless/${path}`);
    }

    if (page == null) {
        notFound();
    }

    const toc = await getTableOfContents(page.body.raw);
    const MDX = getMDXComponent(page.body.code);

    return (
        <DocsPage toc={toc} tree={tree}>
            <MDXContent>
                <h1>{page.title}</h1>
                <MDX
                    components={{
                        Card: (props) => <Card {...props} />,
                        Cards: (props) => <Cards {...props} />,
                        a: (props) => <Link {...props} />,
                        pre: (props) => <Pre {...props} />,
                        img: (props) => <Image {...props} />,
                        h1: (props) => <Heading as="h1" {...props} />,
                        h2: (props) => <Heading as="h2" {...props} />,
                        h3: (props) => <Heading as="h3" {...props} />,
                        h4: (props) => <Heading as="h4" {...props} />,
                        h5: (props) => <Heading as="h5" {...props} />,
                        h6: (props) => <Heading as="h6" {...props} />,
                        table: (props) => <Table {...props} />,
                    }}
                />
            </MDXContent>
        </DocsPage>
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

export function generateStaticParams({ params }: { params: { mode: string } }) {
    return allDocs.map((docs) => ({
        slug: docs.slug.split("/"),
        ...params,
    }));
}
