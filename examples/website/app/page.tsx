import { allDocs, allMeta } from "@/.contentlayer/generated";
import Layout from "next-docs-ui/layout";
import { buildPageTree } from "next-docs-zeta/contentlayer";

export default function Page() {
    const tree = buildPageTree(allMeta, allDocs);

    return (
        <Layout tree={tree} navTitle="My App">
            <p>Hello</p>
        </Layout>
    );
}
