import Link from "next/link";
import { ReactNode } from "react";

export function Cards({ children }: { children: ReactNode }) {
    return (
        <div className="nd-grid nd-grid-cols-1 md:nd-grid-cols-2 nd-gap-5 nd-not-prose">
            {children}
        </div>
    );
}

export function Card({
    href,
    title,
    description,
}: {
    href: string;
    title: string;
    description: string;
}) {
    const external = !href.startsWith("/");

    return (
        <Link
            href={href}
            target={external ? "_blank" : "_self"}
            rel={external ? "noreferrer" : ""}
            className="nd-flex nd-flex-col nd-gap-2 nd-shadow-lg nd-rounded-xl nd-p-4 nd-border nd-bg-background/50 nd-transition-colors hover:nd-border-purple-400 hover:nd-shadow-purple-400/20"
        >
            <h3 className="nd-text-foreground nd-font-semibold">{title}</h3>
            <p className="nd-text-muted-foreground nd-text-sm">{description}</p>
        </Link>
    );
}
