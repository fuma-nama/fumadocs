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
import {
    Accordion,
    AccordionTrigger,
    AccordionItem,
    AccordionContent,
} from "@/components/ui/accordion";

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
        <DocsPage
            toc={toc}
            tree={tree}
            tocContent={
                <div className="pt-4 mt-4 border-t">
                    <a
                        href={`https://github.com/SonMooSans/next-docs/blob/main/apps/docs/content/${page._raw.sourceFilePath}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-xs text-muted-foreground font-medium hover:text-foreground"
                    >
                        Edit this Page -&gt;
                    </a>
                </div>
            }
        >
            <MDXContent>
                <div className="nd-not-prose">
                    <h1 className="text-3xl sm:text-4xl mb-8 font-bold">
                        {page.title}
                    </h1>
                </div>
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
                        Accordion: (props) => <Accordion {...props} />,
                        AccordionTrigger: (props) => (
                            <AccordionTrigger {...props} />
                        ),
                        AccordionItem: (props) => <AccordionItem {...props} />,
                        AccordionContent: (props) => (
                            <AccordionContent {...props} />
                        ),
                    }}
                />
            </MDXContent>
        </DocsPage>
    );
}

export function generateMetadata({ params }: { params: Param }): Metadata {
    const path = [params.mode, ...(params.slug ?? [])].join("/");
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

export function generateStaticParams() {
    return allDocs.map((docs) => {
        const [mode, ...slugs] = docs.slug.split("/");

        return {
            slug: slugs,
            mode,
        };
    });
}
