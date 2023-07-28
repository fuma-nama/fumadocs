import { allDocs, allMeta } from "contentlayer/generated";
import { buildPageTree, loadContext } from "next-docs-zeta/contentlayer";
import type { TreeNode } from "next-docs-zeta/server";

const ctx = loadContext(allMeta, allDocs);

export const uiTree = buildPageTree(ctx, {
    root: "docs/ui",
});
export const headlessTree = buildPageTree(ctx, {
    root: "docs/headless",
});

export function getTree(mode: "ui" | "headless" | string): TreeNode[] {
    if (mode === "ui") {
        return uiTree;
    }

    return headlessTree;
}
