"use client";
import { I18nProvider } from "next-docs-ui/i18n";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ReactNode, useCallback } from "react";
import { defaultLanguage } from "./i18n";

export function ClientI18nProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { lang } = useParams() as { lang?: string };
    const onChange = useCallback(
        (v: string) => {
            const segments = pathname.split("/");

            segments[1] = v;

            router.push(segments.join("/"));
        },
        [router, pathname]
    );

    return (
        <I18nProvider value={{ locale: lang ?? defaultLanguage, onChange }}>
            {children}
        </I18nProvider>
    );
}
