import { NextResponse } from "next/server";
import FlexSearch from "flexsearch";

type Page = {
    title: string;
    content: string;
    url: string;
    keywords?: string;
};

export function initAPI(indexes: Page[]): {
    GET: (request: Request) => Response | Promise<Response>;
} {
    const index = new FlexSearch.Document<Page, ["title", "url"]>({
        tokenize: "forward",
        optimize: true,
        resolution: 9,
        cache: 100,
        document: {
            id: "url",
            store: ["title", "url"],
            index: [
                {
                    field: "title",
                    tokenize: "forward",
                    optimize: true,
                    resolution: 9,
                },
                {
                    field: "content",
                    tokenize: "strict",
                    optimize: true,
                    resolution: 9,
                    context: {
                        depth: 1,
                        resolution: 3,
                    },
                },
                {
                    field: "keywords",
                    tokenize: "strict",
                    optimize: true,
                    resolution: 9,
                },
            ],
        },
    });

    for (const page of indexes) {
        index.add({
            title: page.title,
            url: page.url,
            content: page.content,
            keywords: page.keywords,
        });
    }

    return {
        GET(request) {
            const { searchParams } = new URL(request.url);
            const query = searchParams.get("query");

            if (query == null) return NextResponse.error();

            const results = index.search(query, 5, {
                enrich: true,
                suggest: true,
            });

            return NextResponse.json(results[0]?.result ?? []);
        },
    };
}

export type SearchDocsResult =
    FlexSearch.EnrichedDocumentSearchResultSetUnitResultUnit<Page>[];
