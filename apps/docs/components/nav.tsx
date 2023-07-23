"use client";
import { cn } from "@/utils/cn";
import { cva } from "class-variance-authority";
import { GithubIcon } from "lucide-react";
import { Nav as OriginalNav } from "next-docs-ui/components";
import Link from "next/link";

const item = cva(
    "px-2 py-1 rounded-md text-muted-foreground transition-colors hover:text-accent-foreground",
    {
        variants: {
            active: {
                true: "bg-accent text-accent-foreground",
                false: "",
            },
        },
    }
);

export function Nav({ mode }: { mode?: "ui" | "headless" | string }) {
    return (
        <OriginalNav
            enableSidebar={mode === "headless" || mode === "ui"}
            links={[
                {
                    icon: <GithubIcon className="w-5 h-5" />,
                    href: "https://www.npmjs.com/package/next-docs-zeta",
                    external: true,
                },
            ]}
        >
            <Link
                href="/"
                className="font-semibold whitespace-nowrap hover:text-muted-foreground"
            >
                Next Docs
            </Link>
            <div className="max-sm:absolute max-sm:top-[50%] max-sm:left-[50%] max-sm:-translate-x-[50%] max-sm:-translate-y-[50%]">
                <div className="text-sm border border-input p-1 rounded-md bg-background">
                    <Link
                        href="/docs/headless"
                        className={cn(item({ active: mode === "headless" }))}
                    >
                        Zeta
                    </Link>
                    <Link
                        href="/docs/ui"
                        className={cn(item({ active: mode === "ui" }))}
                    >
                        UI
                    </Link>
                </div>
            </div>
        </OriginalNav>
    );
}
