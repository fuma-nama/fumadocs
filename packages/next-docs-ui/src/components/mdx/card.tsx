import { SafeLink } from "next-docs-zeta/link";
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
    return (
        <SafeLink
            href={href}
            className="nd-flex nd-flex-col nd-gap-2 nd-shadow-lg nd-rounded-xl nd-p-4 nd-border nd-bg-card nd-text-card-foreground nd-transition-colors hover:nd-border-primary hover:nd-shadow-primary/20"
        >
            <h3 className="nd-font-semibold">{title}</h3>
            <p className="nd-text-muted-foreground nd-text-sm">{description}</p>
        </SafeLink>
    );
}
