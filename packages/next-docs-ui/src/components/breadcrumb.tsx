import type { TreeNode } from "next-docs-zeta/server";
import { useBreadcrumb } from "next-docs-zeta/breadcrumb";
import clsx from "clsx";
import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import { usePathname } from "next/navigation";

const itemStyles = "overflow-hidden overflow-ellipsis whitespace-nowrap";

export function Breadcrumb({ tree }: { tree: TreeNode[] }) {
    const pathname = usePathname();
    const items = useBreadcrumb(pathname, tree);

    return (
        <div className="flex flex-row gap-1 text-sm text-muted-foreground items-center">
            <p className={itemStyles}>Docs</p>
            {items.map((item, i) => {
                const active = items.length === i + 1;
                const style = clsx(itemStyles, active && "text-foreground");

                return (
                    <Fragment key={i}>
                        <ChevronRightIcon className="w-4 h-4 flex-shrink-0" />
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
