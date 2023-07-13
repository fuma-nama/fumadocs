import type { TableOfContents } from "./get-toc";

type Block = {
    _type: string;
    children?: Block[];
    style?: string;
    text?: string;
};

type SlugFn = (text: string) => string;

type Item = {
    title: string;
    url: string;
    level: number;
    children?: Item[];
};

/**
 * Parse TOC from portable text (Sanity)
 *
 * @param value Blocks
 * @param slugFn A function that generates slug from title
 */
export function getTableOfContentsFromPortableText(
    value: any,
    slugFn: SlugFn
): TableOfContents {
    if (!Array.isArray(value)) {
        throw new Error("Invalid body type");
    }

    const result: Item[] = [];

    for (const block of value) {
        dfs(block, result, slugFn);
    }

    return result;
}

function dfs(block: Block, list: Item[], slugFn: SlugFn) {
    if (
        block.style != null &&
        block.style.length === 2 &&
        block.style[0] === "h"
    ) {
        const level = Number(block.style[1]);

        if (Number.isNaN(level)) return;
        const text = flattenNode(block);
        const item = {
            title: text,
            url: slugFn(text),
            level,
        };

        let lastElement = list[list.length - 1];

        if (lastElement != null && lastElement.level < level) {
            while (lastElement.children != null) {
                const lastChild =
                    lastElement.children[lastElement.children.length - 1];

                if (lastChild == null || lastChild.level >= level) {
                    break;
                }

                lastElement = lastChild;
            }

            if (lastElement.children == null) {
                lastElement.children = [];
            }

            lastElement.children.push(item);
        } else {
            list.push(item);
        }

        return;
    }

    block.children?.forEach((child) => {
        dfs(child, list, slugFn);
    });
}

function flattenNode(block: Block): string {
    let text = "";

    if (block._type === "span") {
        return block.text!!;
    }

    block.children?.forEach((child) => {
        text += flattenNode(child);
    });

    return text;
}
