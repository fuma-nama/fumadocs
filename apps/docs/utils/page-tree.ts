import { allDocs, allMeta } from "@/.contentlayer/generated";
import { buildPageTree } from "next-docs-zeta/contentlayer";

export const tree = buildPageTree(allMeta, allDocs);
