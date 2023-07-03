import { LinkIcon } from "lucide-react";
import Link from "next/link";
import { ComponentPropsWithoutRef, ReactNode } from "react";

export const ExternalLink = (props: ComponentPropsWithoutRef<"a">) => {
    const url = props.href ?? "/";
    const isExternalUrl = !(url.startsWith("/") || url.startsWith("#"));

    return (
        <Link
            {...props}
            href={url}
            target={isExternalUrl ? "_blank" : "_self"}
            rel={isExternalUrl ? "noreferrer" : undefined}
        />
    );
};

export function WithLink({
    id,
    children,
}: {
    id?: string;
    children: ReactNode;
}) {
    return (
        <>
            <span id={id} className="absolute -mt-20" />
            {children}

            <a
                href={`#${id}`}
                className="opacity-0 group-hover:opacity-100 inline-block ml-2 text-muted-foreground"
            >
                <LinkIcon className="w-4 h-4" />
            </a>
        </>
    );
}
