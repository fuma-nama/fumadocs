import clsx from "clsx";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";

export type FooterProps = {
    previous?: { name: string; url: string };
    next?: { name: string; url: string };
};

const item =
    "nd-flex nd-flex-row nd-gap-2 nd-items-end nd-text-sm nd-text-muted-foreground";

export function Footer({ next, previous }: FooterProps) {
    return (
        <div className="nd-flex nd-flex-row nd-mt-8 nd-gap-4 nd-flex-wrap">
            {previous && (
                <Link href={previous.url} className={item}>
                    <ChevronLeftIcon className="w-5 h-5" />
                    <div>
                        <p className="nd-text-xs">Previous</p>
                        <p className="font-medium nd-text-foreground">
                            {previous.name}
                        </p>
                    </div>
                </Link>
            )}
            {next && (
                <Link href={next.url} className={clsx(item, "ml-auto")}>
                    <div>
                        <p className="nd-text-xs">Next</p>
                        <p className="font-medium nd-text-foreground">
                            {next.name}
                        </p>
                    </div>
                    <ChevronRightIcon className="w-5 h-5" />
                </Link>
            )}
        </div>
    );
}
