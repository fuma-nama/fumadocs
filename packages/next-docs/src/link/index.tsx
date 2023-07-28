"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnchorHTMLAttributes } from "react";

type SafeLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
    /**
     * Enable dynamic href
     *
     * @default false
     */
    dynamicHrefs?: boolean;
};

/**
 * Wraps `next/link` and safe to use in mdx documents
 *
 * It also supports dynamic hrefs, which means you can use `/[lang]/my-page` with `dynamicHrefs` enabled
 */
export function SafeLink({ dynamicHrefs = false, ...props }: SafeLinkProps) {
    let url = props.href ?? "/";
    const isExternalUrl = !(
        url.startsWith("/") ||
        url.startsWith("#") ||
        url.startsWith(".")
    );
    const params = useParams();

    if (!isExternalUrl && dynamicHrefs) {
        url = url.replace(/\[.*\]/, (key) => {
            const value = params[key.slice(1, -1)] ?? "undefined";

            return typeof value === "string" ? value : value.join("/");
        });
    }

    return (
        <Link
            {...props}
            href={url}
            prefetch={!isExternalUrl} //disable prefetch if it's an external link
            target={isExternalUrl ? "_blank" : "_self"}
            rel={isExternalUrl ? "noreferrer noopener" : undefined}
        />
    );
}
