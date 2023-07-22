"use client";
import NextImage from "next/image";
import { ComponentPropsWithoutRef, ReactNode } from "react";

export { Card, Cards } from "@/components/mdx/card";
export { Pre } from "@/components/mdx/pre";
export { Heading } from "@/components/mdx/heading";
export { SafeLink as Link } from "next-docs-zeta/link";

export const Image = ({ alt, ...props }: ComponentPropsWithoutRef<"img">) => (
    <NextImage alt={alt ?? "image"} sizes="90vw" {...(props as any)} />
);

export const Table = (props: ComponentPropsWithoutRef<"table">) => (
    <div className="nd-relative nd-overflow-auto">
        <table {...props} />
    </div>
);

export function MDXContent({ children }: { children: ReactNode }) {
    return (
        <div className="nd-prose nd-prose-text prose-pre:nd-grid prose-pre:nd-border prose-code:nd-p-1 prose-code:nd-rounded-md prose-code:nd-bg-secondary prose-table:nd-whitespace-nowrap nd-max-w-none">
            {children}
        </div>
    );
}
