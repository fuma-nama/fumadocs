import { allDocs, allMeta } from "contentlayer/generated";
import {
    buildPageTreeWithContext,
    preloadContext,
} from "next-docs-zeta/contentlayer";
import type { TreeNode } from "next-docs-zeta/server";

const ctx = preloadContext(allMeta, allDocs);
export const uiTree = buildPageTreeWithContext(ctx, {
    root: "docs/ui",
});
export const headlessTree = buildPageTreeWithContext(ctx, {
    root: "docs/headless",
});

export function getTree(mode: "ui" | "headless" | string): TreeNode[] {
    if (mode === "ui") {
        return uiTree;
    }

    return headlessTree;
}
