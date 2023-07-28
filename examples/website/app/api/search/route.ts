import { languages } from "@/app/i18n";
import { getPages } from "@/app/tree";
import { getPageUrl } from "next-docs-zeta/contentlayer";
import { initI18nSearchAPI } from "next-docs-zeta/server";

export const { GET } = initI18nSearchAPI(
    languages.map((lang) => {
        const pages = getPages(lang)!.map((page) => ({
            title: page.title,
            content: page.body.raw,
            url: getPageUrl(page.slug.split("/"), "/", lang),
        }));

        return [lang, pages];
    })
);
