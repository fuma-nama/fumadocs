import type { FolderNode, FileNode, TreeNode } from "../server/types";
import type { RawDocumentData } from "contentlayer/source-files";

type MetaPageBase = {
    /** File path relative to `contentDirPath` */
    _id: string;
    _raw: RawDocumentData;
    type: "Meta";
    /** The title of the folder */
    title?: string | undefined;
    /** Pages of the folder */
    pages: string[];
    slug: string;
};

type DocsPageBase = {
    /** File path relative to `contentDirPath` */
    _id: string;
    _raw: RawDocumentData;
    type: "Docs";
    /** The title of the document */
    title: string;
    /** The description of the document */
    description?: string | undefined;
    slug: string;
};

type Context = {
    docs: DocsPageBase[];
    docsMap: Map<string, DocsPageBase>;
    metaMap: Map<string, MetaPageBase>;
    getUrl: (slug: string, locale?: string) => string;
    lang?: string;
};

type Options = {
    /**
     * The root folder to scan files
     * @default 'docs'
     */
    root: string;
    /**
     * Base URL of documents
     * @default "/docs"
     */
    baseUrl: string;

    /**
     * Get page url from slug and locale
     */
    getUrl: (slug: string[], baseUrl: string, locale?: string) => string;
};

const defaultGetUrl: Options["getUrl"] = (slug, baseUrl, locale) => {
    const url = [baseUrl, locale, ...slug]
        .filter((segment) => segment != null && segment.length > 0)
        .join("/");

    if (baseUrl === "/") {
        return url.slice(1);
    }

    return url;
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

        const path = meta._raw.sourceFileDir + "/" + item;
        const page = ctx.docsMap.get(path);

        if (page != null) {
            const node = buildFileNode(page, ctx);

            if (item === "index") index = node;
            return node;
        }

        //folder can't be index
        if (item === "index") {
            return [];
        }

        const node = buildFolderNode(path, ctx);

        // if item doesn't exist
        if (node.index == null && node.children.length === 0) return [];

        return node;
    });

    if (index == null) {
        const page = ctx.docsMap.get(meta._raw.sourceFileDir + "/index");

        if (page != null) index = buildFileNode(page, ctx);
    }

    return {
        name: meta.title ?? pathToName(segments[segments.length - 1] ?? "docs"),
        index: index,
        type: "folder",
        url: ctx.getUrl(meta.slug, ctx.lang),
        children: children,
    };
}

function getKey(page: DocsPageBase) {
    return page._raw.sourceFileDir === page._raw.flattenedPath
        ? page._raw.flattenedPath + "/index"
        : page._raw.flattenedPath;
}

function buildFileNode(page: DocsPageBase, ctx: Context): FileNode {
    if (ctx.lang) {
        page = ctx.docsMap.get(getKey(page) + `.${ctx.lang}`) ?? page;
    }

    return {
        type: "page",
        name: page.title,
        url: ctx.getUrl(page.slug, ctx.lang),
    };
}

function buildFolderNode(
    path: string,
    ctx: Context,
    keepIndex: boolean = false
): FolderNode {
    let meta = ctx.lang ? ctx.metaMap.get(path + `/meta-${ctx.lang}`) : null;
    meta = meta ?? ctx.metaMap.get(path + "/meta");

    if (meta != null) {
        return buildMeta(meta, ctx);
    }

    const segments = path.split("/");
    let index: FileNode | undefined = undefined;

    // files under the directory
    const children: TreeNode[] = ctx.docs
        .filter((page) => page._raw.sourceFileDir === path)
        .flatMap((page) => {
            const node = buildFileNode(page, ctx);

            if (page._raw.flattenedPath === path) {
                index = node;
                if (!keepIndex) return [];
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

function buildPageTreeWithContext(
    root: string = "docs",
    ctx: Context
): TreeNode[] {
    const folder = buildFolderNode(root, ctx, true);

    return folder?.children ?? [];
}

/**
 * @returns A page tree
 */
export function buildPageTree(
    metaPages: MetaPageBase[],
    docsPages: DocsPageBase[],
    {
        root = "docs",
        baseUrl = "/docs",
        getUrl = defaultGetUrl,
    }: Partial<Options> = {}
): TreeNode[] {
    const docsMap = new Map<string, DocsPageBase>();
    const metaMap = new Map<string, MetaPageBase>();

    for (const page of docsPages) {
        docsMap.set(getKey(page), page);
    }

    for (const meta of metaPages) {
        metaMap.set(meta._raw.flattenedPath, meta);
    }

    const folder = buildFolderNode(
        root,
        {
            docs: docsPages,
            docsMap,
            metaMap,
            getUrl: (slug, locale) => {
                return getUrl(slug.split("/"), baseUrl, locale);
            },
        },
        true
    );

    return folder?.children ?? [];
}

/**
 * Build page tree and fallback to the default language if the page doesn't exist
 *
 * @param metas Meta files
 * @param docs Docs files
 * @param languages All supported languages
 */
export function buildMultiLangPageTree<Languages extends string>(
    metas: MetaPageBase[],
    docs: DocsPageBase[],
    languages: Languages[],
    {
        root = "docs",
        baseUrl = "/docs",
        getUrl = defaultGetUrl,
    }: Partial<Options> = {}
): Record<Languages, TreeNode[]> {
    const docsMap = new Map<string, DocsPageBase>();
    const metaMap = new Map<string, MetaPageBase>();

    for (const page of docs) {
        docsMap.set(getKey(page), page);
    }

    for (const meta of metas) {
        metaMap.set(meta._raw.flattenedPath, meta);
    }

    const entries = languages.map((lang) => {
        const tree = buildPageTreeWithContext(root, {
            docs,
            docsMap,
            metaMap,
            lang,
            getUrl: (slug, locale) => {
                return getUrl(slug.split("/"), baseUrl, locale);
            },
        });

        return [lang, tree];
    });

    return Object.fromEntries(entries);
}

function pathToName(path: string): string {
    return path.slice(0, 1).toUpperCase() + path.slice(1);
}
