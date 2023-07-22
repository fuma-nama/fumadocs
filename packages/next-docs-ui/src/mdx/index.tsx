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
    <div className="relative overflow-auto">
        <table {...props} />
    </div>
);

export function MDXContent({ children }: { children: ReactNode }) {
    return (
        <div className="prose prose-text prose-pre:grid prose-pre:border prose-code:p-1 prose-code:rounded-md prose-code:bg-secondary prose-table:whitespace-nowrap max-w-none">
            {children}
        </div>
    );
}
