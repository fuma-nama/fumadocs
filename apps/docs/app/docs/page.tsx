import { Nav } from "@/components/nav";
import { cn } from "@/utils/cn";
import { cva } from "class-variance-authority";
import { LayoutIcon, LibraryIcon } from "lucide-react";
import Link from "next/link";

const item = cva(
    "group relative overflow-hidden rounded-xl z-[2] p-px after:absolute after:-inset-px after:-z-[1] after:duration-300 after:transition-rotate-angle after:[--rotate-angle:-20deg] hover:after:[--rotate-angle:135deg]"
);

export default function DocsRoot() {
    return (
        <main className="relative">
            <Nav />
            <div className="absolute top-0 right-0 -translate-x-[50%] -translate-y-[50%] -z-[1] w-full max-w-[1000px] h-[500px] blur-3xl">
                <div className="[mask-image:linear-gradient(to_bottom,white,transparent)] bg-gradient-to-r from-purple-400 to-blue-400 w-full h-full" />
            </div>
            <div className="container py-20">
                <h1 className="text-3xl sm:text-4xl font-bold">Choose One.</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                    <Link
                        href="/docs/headless"
                        className={cn(
                            item(),
                            "after:bg-gradient-to-animated after:from-blue-500/30 after:to-purple-400"
                        )}
                    >
                        <div className="rounded-xl h-full bg-background p-6 bg-gradient-to-br from-purple-400/20 group-hover:from-purple-400/10">
                            <LibraryIcon className="text-purple-400 dark:text-purple-200 w-9 h-9 mb-2" />
                            <p className="font-semibold text-lg mb-2">
                                Next Docs Zeta
                            </p>
                            <p className="text-sm text-muted-foreground">
                                The Headless UI Library for building
                                documentation websites.
                            </p>
                        </div>
                    </Link>

                    <Link
                        href="/docs/ui"
                        className={cn(
                            item(),
                            "after:bg-gradient-to-animated after:from-pink-500/20 after:to-blue-400"
                        )}
                    >
                        <div className="rounded-xl bg-background p-6 h-full bg-gradient-to-br from-blue-400/20 group-hover:from-blue-400/10">
                            <LayoutIcon className="text-cyan-400 dark:text-cyan-200 w-9 h-9 mb-2" />
                            <span className="absolute top-4 right-4 text-xs rounded-full px-2 py-1 border border-blue-400 dark:border-blue-200/50 dark:text-cyan-100">
                                Work in progress
                            </span>
                            <p className="font-semibold text-lg mb-2">
                                Next Docs UI
                            </p>
                            <p className="text-sm text-muted-foreground">
                                The Framework for building documentation
                                websites with well designed UI.
                            </p>
                        </div>
                    </Link>
                </div>
            </div>
        </main>
    );
}
