import Link from "next/link";
import { ReactNode } from "react";

export function Cards({ children }: { children: ReactNode }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 not-prose">
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
            className="flex flex-col gap-2 shadow-lg rounded-xl p-4 border bg-background/50 transition-colors hover:border-purple-400 hover:shadow-purple-400/20"
        >
            <h3 className="text-foreground font-semibold">{title}</h3>
            <p className="text-muted-foreground text-sm">{description}</p>
        </Link>
    );
}
