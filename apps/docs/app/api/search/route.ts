import { allDocs } from "contentlayer/generated";
import { initAPI } from "next-docs/api";

export const { GET } = initAPI(
    allDocs.map((docs) => ({
        title: docs.title,
        content: docs.body.raw,
        url: docs.url,
    }))
);
