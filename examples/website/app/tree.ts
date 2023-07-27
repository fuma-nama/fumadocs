import { allMeta, allDocs } from "contentlayer/generated";
import { buildMultiLangPageTree } from "next-docs-zeta/contentlayer";

export const languages = ["en", "cn"];

export const trees = buildMultiLangPageTree(allMeta, allDocs, languages, {
    baseUrl: "/",
});

export function getPage(lang: string, slugs?: string[]) {
    const path = (slugs ?? []).join("/");

    return (
        allDocs.find((page) => {
            return (
                page.slug === path &&
                (lang === "en" ? page.locale == null : page.locale === lang)
            );
        }) ?? allDocs.find((page) => page.slug === path)
    );
}
