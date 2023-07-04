import Link from "next/link";
import { ComponentPropsWithoutRef } from "react";

/**
 * A Component that is safe to use in mdx documents, based on `next/link`
 */
export const SafeLink = (props: ComponentPropsWithoutRef<"a">) => {
    const url = props.href ?? "/";
    const isExternalUrl = !(url.startsWith("/") || url.startsWith("#"));

    return (
        <Link
            {...props}
            href={url}
            prefetch={!isExternalUrl} //disable prefetch if it's an external link
            target={isExternalUrl ? "_blank" : "_self"}
            rel={isExternalUrl ? "noreferrer noopener" : undefined}
        />
    );
};
