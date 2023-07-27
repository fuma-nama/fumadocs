import { DocsLayout } from "next-docs-ui/layout";
import { trees } from "../tree";
import { ReactNode } from "react";
import { LanguageSelect } from "next-docs-ui/i18n";

export default function Layout({
    params,
    children,
}: {
    params: { lang: string };
    children: ReactNode;
}) {
    const tree = trees[params.lang];

    return (
        <DocsLayout
            tree={tree ?? []}
            navTitle="My App"
            githubUrl="https://github.com/SonMooSans/next-docs"
            sidebarContent={
                <LanguageSelect
                    paramIndex={1}
                    value={params.lang}
                    languages={[
                        {
                            name: "English",
                            locale: "en",
                        },
                        {
                            name: "Chinese",
                            locale: "cn",
                        },
                    ]}
                />
            }
        >
            {children}
        </DocsLayout>
    );
}
