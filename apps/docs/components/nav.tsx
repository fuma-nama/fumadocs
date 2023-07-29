"use client";
import { GithubIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { Nav as OriginalNav } from "next-docs-ui/components";
import Link from "next/link";
import clsx from "clsx";

const item =
    "px-2 py-1 rounded-md text-muted-foreground transition-colors hover:text-accent-foreground";

export function Nav() {
    const { mode } = useParams();

    return (
        <OriginalNav
            enableSidebar={mode === "headless" || mode === "ui"}
            links={[
                {
                    icon: (
                        <GithubIcon aria-label="Github" className="w-5 h-5" />
                    ),
                    href: "https://github.com/SonMooSans/next-docs",
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
                        className={clsx(
                            item,
                            mode === "headless" &&
                                "bg-accent text-accent-foreground"
                        )}
                    >
                        Zeta
                    </Link>
                    <Link
                        href="/docs/ui"
                        className={clsx(
                            item,
                            mode === "ui" && "bg-accent text-accent-foreground"
                        )}
                    >
                        UI
                    </Link>
                </div>
            </div>
        </OriginalNav>
    );
}
