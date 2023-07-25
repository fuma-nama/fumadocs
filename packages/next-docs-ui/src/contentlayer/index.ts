import { Args, defineDocumentType } from "contentlayer/source-files";
import rehypePrettycode, { Options as CodeOptions } from "rehype-pretty-code";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";

/**
 * Base url
 */
let urlBase = "/docs";

/**
 * Where the docs files located
 */
let docsPattern = "docs";

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

function pathToUrl(base: string, path: string, prefix: string): string {
    return [base + removePattern(path, prefix)].join("/");
}

export const Docs = defineDocumentType(() => ({
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
                return pathToUrl(urlBase, post._raw.flattenedPath, docsPattern);
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

export const Meta = defineDocumentType(() => ({
    name: "Meta",
    filePathPattern: `${docsPattern}/**/meta.json`,
    contentType: "data",
    fields: {
        title: {
            type: "string",
            description: "The title of the folder",
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

/**
 * MDX Plugins
 */
export const mdxPlugins = {
    rehypePrettycode,
    remarkGfm,
    rehypeSlug,
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

export const defaultConfig: Args = {
    contentDirPath: "content",
    documentTypes: [Docs, Meta],
    mdx: {
        rehypePlugins: [[rehypePrettycode, codeOptions], rehypeSlug],
        remarkPlugins: [remarkGfm],
    },
};

/**
 *
 * @param url Base url, default '/docs'
 * @param pattern Where the docs files located, default 'docs' (no leading slash)
 */
export function createConfig(url?: string, pattern?: string) {
    urlBase = url ?? urlBase;
    docsPattern = pattern ?? docsPattern;

    return defaultConfig;
}
