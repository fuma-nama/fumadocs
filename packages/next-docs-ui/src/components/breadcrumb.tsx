import type { TreeNode } from "next-docs-zeta/server";
import { useBreadcrumb } from "next-docs-zeta/breadcrumb";
import clsx from "clsx";
import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import { usePathname } from "next/navigation";

const itemStyles =
    "nd-overflow-hidden nd-overflow-ellipsis nd-whitespace-nowrap";

export function Breadcrumb({ tree }: { tree: TreeNode[] }) {
    const pathname = usePathname();
    const items = useBreadcrumb(pathname, tree);

    return (
        <div className="nd-flex nd-flex-row nd-gap-1 nd-text-sm nd-text-muted-foreground nd-items-center">
            <p className={itemStyles}>Docs</p>
            {items.map((item, i) => {
                const active = items.length === i + 1;
                const style = clsx(itemStyles, active && "nd-text-foreground");

                return (
                    <Fragment key={i}>
                        <ChevronRightIcon className="nd-w-4 nd-h-4 nd-flex-shrink-0" />
                        {item.url != null ? (
                            <Link href={item.url} className={style}>
                                {item.name}
                            </Link>
                        ) : (
                            <p className={style}>{item.name}</p>
                        )}
                    </Fragment>
                );
            })}
        </div>
    );
}
