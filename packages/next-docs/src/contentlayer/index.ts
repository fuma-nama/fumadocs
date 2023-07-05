import type { TreeNode } from "../server/types";

export function buildPageTree(metaPages: any, docsPages: any): TreeNode[] {
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
        const page = allDocs.find((page) => {
            return (
                page._raw.flattenedPath === path ||
                (item === "index" &&
                    page._raw.flattenedPath === folder.join("/"))
            );
        });
        const meta = allMeta.find((meta) => meta._raw.sourceFileDir === path);

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
                children: buildPageTree(meta),
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
