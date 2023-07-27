import { Args, defineDocumentType } from "contentlayer/source-files";
import rehypePrettycode, { Options as CodeOptions } from "rehype-pretty-code";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeImgSize, { Options as ImgSizeOptions } from "rehype-img-size";

function removeSlash(path: string) {
    let start = 0,
        end = path.length;
    while (path.charAt(start) == "/") start++;
    while (path.charAt(end - 1) == "/" && end > start) end--;

    return path.slice(start, end);
}

function removePattern(path: string, pattern: string) {
    if (!path.startsWith(pattern)) {
        return path;
    }

    return removeSlash(path.slice(pattern.length));
}

function pathToUrl(base: string, path: string, pattern: string): string {
    const url = removePattern(path, pattern);
    if (url.length === 0) return base;
    if (base === "/") return base + url;

    return base + "/" + url;
}

type Options = {
    /**
     * Base URL of documents
     * @default "/docs"
     */
    urlBase: string;

    /**
     * Where the docs files located
     * @default "docs"
     */
    docsPattern: string;

    /**
     * @default "content"
     */
    contentDirPath: string;

    /**
     * The directory path for images
     * @default "./public"
     */
    imgDirPath: string;
};

export function createConfig(options: Partial<Options> = {}): Args {
    const {
        docsPattern = "docs",
        urlBase = "/docs",
        contentDirPath = "content",
        imgDirPath = "./public",
    } = options;

    const Docs = defineDocumentType(() => ({
        name: "Docs",
        filePathPattern: `${docsPattern}/**/*.mdx`,
        contentType: "mdx",
        fields: {
            title: {
                type: "string",
                description: "The title of the document",
                required: true,
            },
            description: {
                type: "string",
                description: "The description of the document",
                required: false,
            },
        },
        computedFields: {
            url: {
                type: "string",
                resolve: (post) => {
                    return pathToUrl(
                        urlBase,
                        post._raw.flattenedPath,
                        docsPattern
                    );
                },
            },
            slug: {
                type: "string",
                resolve: (post) => {
                    return removePattern(post._raw.flattenedPath, docsPattern);
                },
            },
        },
    }));

    const Meta = defineDocumentType(() => ({
        name: "Meta",
        filePathPattern: `${docsPattern}/**/meta.json`,
        contentType: "data",
        fields: {
            title: {
                type: "string",
                description: "The title of the folder",
                required: false,
            },
            conditions: {
                type: "json",
                required: false,
            },
            pages: {
                type: "list",
                of: {
                    type: "string",
                },
                description: "Pages of the folder",
                default: [],
            },
        },
        computedFields: {
            url: {
                type: "string",
                resolve: (post) =>
                    pathToUrl(urlBase, post._raw.sourceFileDir, docsPattern),
            },
        },
    }));

    return {
        contentDirPath: contentDirPath,
        documentTypes: [Docs, Meta],
        mdx: {
            rehypePlugins: [
                [rehypePrettycode, codeOptions],
                rehypeSlug,
                [
                    rehypeImgSize as any,
                    {
                        dir: imgDirPath,
                    } as ImgSizeOptions,
                ],
            ],
            remarkPlugins: [remarkGfm],
        },
    };
}

/**
 * MDX Plugins
 */
export const mdxPlugins = {
    rehypePrettycode,
    remarkGfm,
    rehypeSlug,
    rehypeImgSize: rehypeImgSize as any, // fix tsc errors
};

export const codeOptions: Partial<CodeOptions> = {
    theme: "css-variables",
    keepBackground: false,
    onVisitLine(node) {
        if (node.children.length === 0) {
            node.children = [{ type: "text", value: " " }];
        }
    },
    onVisitHighlightedLine(node) {
        node.properties.className.push("line-highlighted");
    },
    onVisitHighlightedWord(node) {
        node.properties.className = ["word-highlighted"];
    },
};

export const defaultConfig: Args = createConfig();
