import { DocsPage } from "next-docs-ui/layout";
import {
    Heading,
    Image,
    Pre,
    Link,
    Table,
    MDXContent,
    Card,
    Cards,
} from "next-docs-ui/mdx";
import { getTableOfContents } from "next-docs-zeta/server";
import { allDocs } from "contentlayer/generated";
import { notFound } from "next/navigation";
import { tree } from "../../tree";
import { getMDXComponent } from "next-contentlayer/hooks";

export default async function Page({
    params,
}: {
    params: { slug?: string[] };
}) {
    const path = (params.slug ?? []).join("/");
    const page = allDocs.find((page) => page.slug === path);

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
                        table: (props) => <Table {...props} />,
                        pre: (props) => <Pre {...props} />,
                        a: (props) => <Link {...props} />,
                        h1: (props) => <Heading as="h1" {...props} />,
                        h2: (props) => <Heading as="h2" {...props} />,
                        h3: (props) => <Heading as="h3" {...props} />,
                        h4: (props) => <Heading as="h4" {...props} />,
                        h5: (props) => <Heading as="h5" {...props} />,
                        h6: (props) => <Heading as="h6" {...props} />,
                        img: (props) => <Image {...props} />,
                        Card: (props) => <Card {...props} />,
                        Cards: (props) => <Cards {...props} />,
                    }}
                />
            </MDXContent>
        </DocsPage>
    );
}

export async function generateStaticParams(): Promise<{ slug: string[] }[]> {
    return allDocs.map((docs) => ({
        slug: docs.slug.split("/"),
    }));
}
