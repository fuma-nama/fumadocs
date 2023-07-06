import type { FolderNode, FileNode, TreeNode } from "../server/types";
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

type Context = {
    docs: DocsPageBase[];
    meta: MetaPageBase[];
};

const separator = /---(.*?)---/;

function buildMeta(meta: MetaPageBase, ctx: Context): FolderNode {
    const segments = meta._raw.sourceFileDir.split("/");
    let index: FileNode | undefined = undefined;

    const children = meta.pages.flatMap<TreeNode>((item) => {
        const result = separator.exec(item);

        if (result != null)
            return {
                type: "separator",
                name: result[1],
            };

        const path =
            item === "index"
                ? meta._raw.sourceFileDir
                : meta._raw.sourceFileDir + "/" + item;

        const page = ctx.docs.find((page) => page._raw.flattenedPath === path);

        if (page != null) {
            const node = buildFileNode(page);

            if (item === "index") index = node;
            return node;
        }

        //folder can't be index
        if (item === "index") {
            return [];
        }

        return buildFolderNode(path, ctx);
    });

    if (index == null) {
        const page = ctx.docs.find(
            (page) => page._raw.flattenedPath === meta._raw.sourceFileDir
        );

        if (page != null) index = buildFileNode(page);
    }

    return {
        name: meta.title ?? pathToName(segments[segments.length - 1] ?? "docs"),
        index: index,
        type: "folder",
        url: meta.url,
        children: children,
    };
}

function buildFileNode(page: DocsPageBase): FileNode {
    return {
        type: "page",
        name: page.title,
        url: page.url,
    };
}

function buildFolderNode(path: string, ctx: Context): FolderNode {
    const segments = path.split("/");
    let index: FileNode | undefined = undefined;

    const meta = ctx.meta.find((meta) => meta._raw.sourceFileDir === path);

    if (meta != null) {
        return buildMeta(meta, ctx);
    }

    // files under the directory
    const children: TreeNode[] = ctx.docs
        .filter((page) => page._raw.sourceFileDir === path)
        .flatMap((page) => {
            const node = buildFileNode(page);

            if (page._raw.flattenedPath === path) {
                index = node;
                return [];
            }

            return node;
        });

    // find folders under the directory
    const folders = new Set<string>(
        ctx.docs
            .filter(
                (page) =>
                    page._raw.sourceFileDir.startsWith(path + "/") &&
                    page._raw.sourceFileDir.split("/").length ===
                        segments.length + 1
            )
            .map((page) => page._raw.sourceFileDir)
    );

    for (const folder of folders) {
        children.push(buildFolderNode(folder, ctx));
    }

    return {
        name:
            index != null
                ? (index as FileNode).name
                : pathToName(segments[segments.length - 1] ?? "docs"),
        type: "folder",
        url: "/" + path,
        index,
        children,
    };
}

/**
 *
 * @param metaPages All meta
 * @param docsPages All docs
 * @param root The root folder to scan files
 * @returns A page tree
 */
export function buildPageTree(
    metaPages: MetaPageBase[],
    docsPages: DocsPageBase[],
    root: string = "docs"
): TreeNode[] {
    return buildFolderNode(root, {
        docs: docsPages,
        meta: metaPages,
    }).children;
}

function pathToName(path: string): string {
    return path.slice(0, 1).toUpperCase() + path.slice(1);
}
