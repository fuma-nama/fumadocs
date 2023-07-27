import { allDocs, allMeta } from "contentlayer/generated";
import { buildPageTree } from "next-docs-zeta/contentlayer";
import type { TreeNode } from "next-docs-zeta/server";

export const uiTree = buildPageTree(allMeta, allDocs, {
    root: "docs/ui",
});
export const headlessTree = buildPageTree(allMeta, allDocs, {
    root: "docs/headless",
});

export function getTree(mode: "ui" | "headless" | string): TreeNode[] {
    if (mode === "ui") {
        return uiTree;
    }

    return headlessTree;
}
