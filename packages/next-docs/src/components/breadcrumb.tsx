import { TreeNode } from "@/lib/generate-tree";
import { useMemo } from "react";
import { usePathname } from "next/navigation";

type Item = {
    name: string;
    url: string | null;
};

export function useBreadcrumb({ tree }: { tree: TreeNode[] }) {
    const pathname = usePathname();

    return useMemo(() => searchPath(tree, pathname) ?? [], [tree, pathname]);
}

function searchPath(nodes: TreeNode[], url: string): Item[] | null {
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        if (node.type === "folder") {
            if (node.url === url) {
                return [
                    {
                        name: node.name,
                        url: node.index?.url ?? null,
                    },
                ];
            }

            const items = searchPath(node.children, url);

            if (items != null) {
                items.unshift({
                    name: node.name,
                    url: node.index?.url ?? null,
                });

                return items;
            }
        }

        if (node.type === "page" && node.url === url) {
            return [
                {
                    name: node.name,
                    url: node.url,
                },
            ];
        }
    }

    return null;
}
