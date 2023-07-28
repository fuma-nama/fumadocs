import { allMeta, allDocs } from "contentlayer/generated";
import {
    buildI18nPageTree,
    createUtils,
    loadContext,
} from "next-docs-zeta/contentlayer";
import { languages } from "./i18n";

const ctx = loadContext(allMeta, allDocs, languages);
export const trees = buildI18nPageTree(ctx, languages, {
    baseUrl: "/",
});

export const { getPage, getPages } = createUtils(ctx);
