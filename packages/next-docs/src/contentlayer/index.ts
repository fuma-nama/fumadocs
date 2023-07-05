import type { TreeNode } from "../server/types";
import type { RawDocumentData } from "contentlayer/source-files";

export type MetaPageBase = {
    /** File path relative to `contentDirPath` */
    _id: string;
    _raw: RawDocumentData;
    type: "Meta";
    /** The title of the folder */
    title?: string | undefined;
    /** Pages of the folder */
    pages: string[];
    url: string;
};

export type DocsPageBase = {
    /** File path relative to `contentDirPath` */
    _id: string;
    _raw: RawDocumentData;
    type: "Docs";
    /** The title of the document */
    title: string;
    /** The description of the document */
    description?: string | undefined;
    url: string;
    slug: string;
};

export function buildPageTree(
    metaPages: MetaPageBase[],
    docsPages: DocsPageBase[],
    startFrom?: MetaPageBase
): TreeNode[] {
    const meta =
        startFrom ??
        metaPages.find((meta) => meta._raw.flattenedPath === "docs/meta")!;

    const folder = meta._raw.sourceFileDir.split("/").filter((c) => c !== ".");

    return meta.pages.flatMap<TreeNode>((item) => {
        const separator = /---(.*?)---/;

        const result = separator.exec(item);

        if (result != null)
            return {
                type: "separator",
                name: result[1],
            };

        const path = [...folder, item].join("/");
        const page = docsPages.find((page) => {
            return (
                page._raw.flattenedPath === path ||
                (item === "index" &&
                    page._raw.flattenedPath === folder.join("/"))
            );
        });
        const meta = metaPages.find((meta) => meta._raw.sourceFileDir === path);

        if (meta != null)
            return {
                type: "folder",
                url: meta.url,
                index:
                    page != null
                        ? {
                              name: page.title,
                              url: page.url,
                              type: "page",
                          }
                        : undefined,
                name: meta.title ?? "",
                children: buildPageTree(metaPages, docsPages, meta),
            };

        if (page != null)
            return {
                type: "page",
                name: page.title,
                url: page.url,
            };

        return [];
    });
}
