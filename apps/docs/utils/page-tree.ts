import { allMeta } from "@/.contentlayer/generated";
import { buildPageTree } from "./generate-tree";

const rootMeta = allMeta.find(
    (meta) => meta._raw.flattenedPath === "docs/meta"
)!;

export const tree = buildPageTree(rootMeta);
