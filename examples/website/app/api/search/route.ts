import { allDocs } from "@/.contentlayer/generated";
import { initSearchAPI } from "next-docs-zeta/server";

export const { GET } = initSearchAPI(
    allDocs.map((page) => ({
        title: page.title,
        content: page.body.raw,
        url: page.url,
    }))
);
